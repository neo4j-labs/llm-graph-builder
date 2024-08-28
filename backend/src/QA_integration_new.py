from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.graphs import Neo4jGraph
import os
from dotenv import load_dotenv
import logging
from langchain_community.chat_message_histories import Neo4jChatMessageHistory
from src.llm import get_llm
from src.shared.common_fn import load_embedding_model
import re
from typing import Any
from datetime import datetime
import time
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableBranch
from langchain.retrievers import ContextualCompressionRetriever
from langchain_community.document_transformers import EmbeddingsRedundantFilter
from langchain.retrievers.document_compressors import EmbeddingsFilter
from langchain.retrievers.document_compressors import DocumentCompressorPipeline
from langchain_text_splitters import TokenTextSplitter
from langchain_core.messages import HumanMessage,AIMessage
from src.shared.constants import *
from src.llm import get_llm
from langchain.chains import GraphCypherQAChain
import json

## Chat models
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_google_vertexai import ChatVertexAI
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from langchain_fireworks import ChatFireworks
from langchain_aws import ChatBedrock
from langchain_community.chat_models import ChatOllama

load_dotenv() 

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL')
EMBEDDING_FUNCTION , _ = load_embedding_model(EMBEDDING_MODEL)


def get_neo4j_retriever(graph, retrieval_query,document_names,mode,index_name="vector",keyword_index="keyword", search_k=CHAT_SEARCH_KWARG_K, score_threshold=CHAT_SEARCH_KWARG_SCORE_THRESHOLD):
    try:
        if mode == "fulltext" or mode == "graph + vector + fulltext":
            neo_db = Neo4jVector.from_existing_graph(
                embedding=EMBEDDING_FUNCTION,
                index_name=index_name,
                retrieval_query=retrieval_query,
                graph=graph,
                search_type="hybrid",
                node_label="Chunk",
                embedding_node_property="embedding",
                text_node_properties=["text"],
                keyword_index_name=keyword_index
            )
            # neo_db = Neo4jVector.from_existing_index(
            #     embedding=EMBEDDING_FUNCTION,
            #     index_name=index_name,
            #     retrieval_query=retrieval_query,
            #     graph=graph,
            #     search_type="hybrid",
            #     keyword_index_name=keyword_index
            # )
            logging.info(f"Successfully retrieved Neo4jVector index '{index_name}' and keyword index '{keyword_index}'")
        else:
            neo_db = Neo4jVector.from_existing_index(
                embedding=EMBEDDING_FUNCTION,
                index_name=index_name,
                retrieval_query=retrieval_query,
                graph=graph
            )
            logging.info(f"Successfully retrieved Neo4jVector index '{index_name}'")
        document_names= list(map(str.strip, json.loads(document_names)))
        if document_names:
            retriever = neo_db.as_retriever(search_type="similarity_score_threshold",search_kwargs={'k': search_k, "score_threshold": score_threshold,'filter':{'fileName': {'$in': document_names}}})
            logging.info(f"Successfully created retriever for index '{index_name}' with search_k={search_k}, score_threshold={score_threshold} for documents {document_names}")
        else:
            retriever = neo_db.as_retriever(search_type="similarity_score_threshold",search_kwargs={'k': search_k, "score_threshold": score_threshold})
            logging.info(f"Successfully created retriever for index '{index_name}' with search_k={search_k}, score_threshold={score_threshold}")
        return retriever
    except Exception as e:
        logging.error(f"Error retrieving Neo4jVector index '{index_name}' or creating retriever: {e}")
        raise Exception("An error occurred while retrieving the Neo4jVector index '{index_name}' or creating the retriever. Please drop and create a new vector index: {e}") from e 
    
def create_document_retriever_chain(llm, retriever):
    try:
        logging.info("Starting to create document retriever chain")

        query_transform_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", QUESTION_TRANSFORM_TEMPLATE),
                MessagesPlaceholder(variable_name="messages")
            ]
        )

        output_parser = StrOutputParser()

        splitter = TokenTextSplitter(chunk_size=CHAT_DOC_SPLIT_SIZE, chunk_overlap=0)
        embeddings_filter = EmbeddingsFilter(
            embeddings=EMBEDDING_FUNCTION,
            similarity_threshold=CHAT_EMBEDDING_FILTER_SCORE_THRESHOLD
        )

        pipeline_compressor = DocumentCompressorPipeline(
            transformers=[splitter, embeddings_filter]
        )

        compression_retriever = ContextualCompressionRetriever(
            base_compressor=pipeline_compressor, base_retriever=retriever
        )

        query_transforming_retriever_chain = RunnableBranch(
            (
                lambda x: len(x.get("messages", [])) == 1,
                (lambda x: x["messages"][-1].content) | compression_retriever,
            ),
            query_transform_prompt | llm | output_parser | compression_retriever,
        ).with_config(run_name="chat_retriever_chain")

        logging.info("Successfully created document retriever chain")
        return query_transforming_retriever_chain

    except Exception as e:
        logging.error(f"Error creating document retriever chain: {e}", exc_info=True)
        raise


def create_neo4j_chat_message_history(graph, session_id):
    """
    Creates and returns a Neo4jChatMessageHistory instance.

    """
    try:

        history = Neo4jChatMessageHistory(
            graph=graph,
            session_id=session_id
        )
        return history

    except Exception as e:
        logging.error(f"Error creating Neo4jChatMessageHistory: {e}")
        raise 

def format_documents(documents,model):
    prompt_token_cutoff = 4
    for models,value in CHAT_TOKEN_CUT_OFF.items():
        if model in models:
            prompt_token_cutoff = value

    sorted_documents = sorted(documents, key=lambda doc: doc.state["query_similarity_score"], reverse=True)
    sorted_documents = sorted_documents[:prompt_token_cutoff]

    formatted_docs = []
    sources = set()

    for doc in sorted_documents:
        source = doc.metadata['source']
        sources.add(source)

        formatted_doc = (
            "Document start\n"
            f"This Document belongs to the source {source}\n"
            f"Content: {doc.page_content}\n"
            "Document end\n"
        )
        formatted_docs.append(formatted_doc)

    return "\n\n".join(formatted_docs), sources

def get_rag_chain(llm,system_template=CHAT_SYSTEM_TEMPLATE):
    question_answering_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_template),
        MessagesPlaceholder(variable_name="messages"),
        (
                "human",
                "User question: {input}"
            ),
    ]
    )
    question_answering_chain = question_answering_prompt | llm 

    return question_answering_chain

def get_sources_and_chunks(sources_used, docs):
    chunkdetails_list = []
    sources_used_set = set(sources_used)

    for doc in docs:
        source = doc.metadata["source"]
        chunkdetails = doc.metadata["chunkdetails"]
        if source in sources_used_set:
            chunkdetails = [{**chunkdetail, "score": round(chunkdetail["score"], 4)} for chunkdetail in chunkdetails]
            chunkdetails_list.extend(chunkdetails)

    result = {
        'sources': sources_used,
        'chunkdetails': chunkdetails_list
    }
    return result

def summarize_messages(llm,history,stored_messages):
    if len(stored_messages) == 0:
        return False
    summarization_prompt = ChatPromptTemplate.from_messages(
        [
            MessagesPlaceholder(variable_name="chat_history"),
            (
                "human",
                "Summarize the above chat messages into a concise message, focusing on key points and relevant details that could be useful for future conversations. Exclude all introductions and extraneous information."
            ),
        ]
    )

    summarization_chain = summarization_prompt | llm

    summary_message = summarization_chain.invoke({"chat_history": stored_messages})

    history.clear()
    history.add_user_message("Our current convertaion summary till now")
    history.add_message(summary_message)
    return True


def get_total_tokens(ai_response,llm):
    
    if isinstance(llm,(ChatOpenAI,AzureChatOpenAI,ChatFireworks,ChatGroq)):
        total_tokens = ai_response.response_metadata['token_usage']['total_tokens']
    elif isinstance(llm,(ChatVertexAI)):
        total_tokens = ai_response.response_metadata['usage_metadata']['prompt_token_count']
    elif isinstance(llm,(ChatBedrock)):
        total_tokens = ai_response.response_metadata['usage']['total_tokens']
    elif isinstance(llm,(ChatAnthropic)):
        input_tokens = int(ai_response.response_metadata['usage']['input_tokens'])
        output_tokens = int(ai_response.response_metadata['usage']['output_tokens'])
        total_tokens = input_tokens + output_tokens
    elif isinstance(llm,(ChatOllama)):
        total_tokens = ai_response.response_metadata["prompt_eval_count"]
    else:
        total_tokens = 0
    return total_tokens


def clear_chat_history(graph,session_id):
    history = Neo4jChatMessageHistory(
        graph=graph,
        session_id=session_id
        )
    history.clear()
    return {
            "session_id": session_id, 
            "message": "The chat History is cleared", 
            "user": "chatbot"
            }

def setup_chat(model, graph, document_names,retrieval_query,mode):
    start_time = time.time()
    if model in ["diffbot"]:
        model = "openai-gpt-4o"
    llm,model_name = get_llm(model)
    logging.info(f"Model called in chat {model} and model version is {model_name}")
    retriever = get_neo4j_retriever(graph=graph,retrieval_query=retrieval_query,document_names=document_names,mode=mode)
    doc_retriever = create_document_retriever_chain(llm, retriever)
    chat_setup_time = time.time() - start_time
    logging.info(f"Chat setup completed in {chat_setup_time:.2f} seconds")
    
    return llm, doc_retriever, model_name

def retrieve_documents(doc_retriever, messages):
    start_time = time.time()
    docs = doc_retriever.invoke({"messages": messages})
    doc_retrieval_time = time.time() - start_time
    logging.info(f"Documents retrieved in {doc_retrieval_time:.2f} seconds") 
    return docs

def process_documents(docs, question, messages, llm,model):
    start_time = time.time()
    formatted_docs, sources = format_documents(docs,model)
    rag_chain = get_rag_chain(llm=llm)
    ai_response = rag_chain.invoke({
        "messages": messages[:-1],
        "context": formatted_docs,
        "input": question 
    })
    result = get_sources_and_chunks(sources, docs)
    content = ai_response.content
    total_tokens = get_total_tokens(ai_response,llm)

    
    predict_time = time.time() - start_time
    logging.info(f"Final Response predicted in {predict_time:.2f} seconds")
    
    return content, result, total_tokens

def summarize_and_log(history, messages, llm):
    start_time = time.time()
    summarize_messages(llm, history, messages)
    history_summarized_time = time.time() - start_time
    logging.info(f"Chat History summarized in {history_summarized_time:.2f} seconds")


def create_graph_chain(model, graph):
    try:
        logging.info(f"Graph QA Chain using LLM model: {model}")

        cypher_llm,model_name = get_llm(model)
        qa_llm,model_name = get_llm(model)
        graph_chain = GraphCypherQAChain.from_llm(
            cypher_llm=cypher_llm,
            qa_llm=qa_llm,
            validate_cypher= True,
            graph=graph,
            # verbose=True, 
            return_intermediate_steps = True,
            top_k=3
        )

        logging.info("GraphCypherQAChain instance created successfully.")
        return graph_chain,qa_llm,model_name

    except Exception as e:
        logging.error(f"An error occurred while creating the GraphCypherQAChain instance. : {e}") 


def get_graph_response(graph_chain, question):
    try:
        cypher_res = graph_chain.invoke({"query": question})
        
        response = cypher_res.get("result")
        cypher_query = ""
        context = []

        for step in cypher_res.get("intermediate_steps", []):
            if "query" in step:
                cypher_string = step["query"]
                cypher_query = cypher_string.replace("cypher\n", "").replace("\n", " ").strip() 
            elif "context" in step:
                context = step["context"]
        return {
            "response": response,
            "cypher_query": cypher_query,
            "context": context
        }
    
    except Exception as e:
        logging.error("An error occurred while getting the graph response : {e}")

def QA_RAG(graph, model, question, document_names,session_id, mode):
    try:
        logging.info(f"Chat Mode : {mode}")
        history = create_neo4j_chat_message_history(graph, session_id)
        messages = history.messages
        user_question = HumanMessage(content=question)
        messages.append(user_question)

        if mode == "graph":
            graph_chain, qa_llm,model_version = create_graph_chain(model,graph)
            graph_response = get_graph_response(graph_chain,question)
            ai_response = AIMessage(content=graph_response["response"]) if graph_response["response"] else AIMessage(content="Something went wrong")
            messages.append(ai_response)
            summarize_and_log(history, messages, qa_llm)

            result = {
                "session_id": session_id, 
                "message": graph_response["response"], 
                "info": {
                    "model": model_version,
                    'cypher_query':graph_response["cypher_query"],
                    "context" : graph_response["context"],
                    "mode" : mode,
                    "response_time": 0
                },
                "user": "chatbot"
            } 
            return result
        elif mode == "vector" or mode == "fulltext":
            retrieval_query = VECTOR_SEARCH_QUERY
        else:
            retrieval_query = VECTOR_GRAPH_SEARCH_QUERY.format(no_of_entites=VECTOR_GRAPH_SEARCH_ENTITY_LIMIT)

        llm, doc_retriever, model_version = setup_chat(model, graph, document_names,retrieval_query,mode)
        
        docs = retrieve_documents(doc_retriever, messages)
                
        if docs:
            content, result, total_tokens = process_documents(docs, question, messages, llm,model)
        else:
            content = "I couldn't find any relevant documents to answer your question."
            result = {"sources": [], "chunkdetails": []}
            total_tokens = 0
        
        ai_response = AIMessage(content=content)
        messages.append(ai_response)
        summarize_and_log(history, messages, llm)
        
        return {
            "session_id": session_id, 
            "message": content, 
            "info": {
                "sources": result["sources"],
                "model": model_version,
                "chunkdetails": result["chunkdetails"],
                "total_tokens": total_tokens,
                "response_time": 0,
                "mode": mode
            },
            "user": "chatbot"
        }

    except Exception as e:
        logging.exception(f"Exception in QA component at {datetime.now()}: {str(e)}")
        error_name = type(e).__name__
        return {
            "session_id": session_id, 
            "message": "Something went wrong",
            "info": {
                "sources": [],
                "chunkids": [],
                "error": f"{error_name} :- {str(e)}",
                "mode": mode
            },
            "user": "chatbot"
        }
