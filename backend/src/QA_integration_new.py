from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.graphs import Neo4jGraph
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_vertexai import ChatVertexAI
from langchain_google_vertexai import HarmBlockThreshold, HarmCategory
import logging
from langchain_community.chat_message_histories import Neo4jChatMessageHistory
from src.shared.common_fn import load_embedding_model, get_llm
import re
from typing import Any
from datetime import datetime
import time
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableBranch
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain.retrievers.document_compressors import LLMChainFilter
from langchain_community.document_transformers import EmbeddingsRedundantFilter
from langchain.retrievers.document_compressors import EmbeddingsFilter
from langchain.retrievers.document_compressors import DocumentCompressorPipeline
from langchain_text_splitters import TokenTextSplitter
from langchain_core.messages import HumanMessage
from src.shared.constants import *

load_dotenv() 

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL')
EMBEDDING_FUNCTION , _ = load_embedding_model(EMBEDDING_MODEL)
CHAT_MAX_TOKENS = 1000
SEARCH_KWARG_K = 2
SEARCH_KWARG_SCORE_THRESHOLD = 0.7

RETRIEVAL_QUERY = """
WITH node as chunk, score
MATCH (chunk)-[:PART_OF]->(d:Document)
CALL { WITH chunk
MATCH (chunk)-[:HAS_ENTITY]->(e)
MATCH path=(e)(()-[rels:!HAS_ENTITY&!PART_OF]-()){0,3}(:!Chunk&!Document)
UNWIND rels as r
RETURN collect(distinct r) as rels
}
WITH d, collect(distinct chunk) as chunks, avg(score) as score, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels
WITH d, score,
[c in chunks | c.text] as texts,  [c in chunks | c.id] as chunkIds,  [c in chunks | c.page_number] as page_numbers,
[r in rels | coalesce(apoc.coll.removeAll(labels(startNode(r)),['__Entity__'])[0],"") +":"+ startNode(r).id + " "+ type(r) + " " + coalesce(apoc.coll.removeAll(labels(endNode(r)),['__Entity__'])[0],"") +":" + endNode(r).id] as entities
WITH d, score,
apoc.text.join(texts,"\n----\n") +
apoc.text.join(entities,"\n")
as text, entities, chunkIds, page_numbers
RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), chunkIds:chunkIds, page_numbers:page_numbers} as metadata
"""

SYSTEM_TEMPLATE = """
You are an AI-powered question-answering agent. Your task is to provide accurate and concise responses to user queries based on the given context, chat history, and available resources.

### Response Guidelines:
1. **Direct Answers**: Provide straightforward answers to the user's queries without headers unless requested. Avoid speculative responses.
2. **Utilize History and Context**: Leverage relevant information from previous interactions, the current user input, and the context provided below.
3. **No Greetings in Follow-ups**: Start with a greeting in initial interactions. Avoid greetings in subsequent responses unless there's a significant break or the chat restarts.
4. **Admit Unknowns**: Clearly state if an answer is unknown. Avoid making unsupported statements.
5. **Avoid Hallucination**: Only provide information based on the context provided. Do not invent information.
6. **Response Length**: Keep responses concise and relevant. Aim for clarity and completeness within 2-3 sentences unless more detail is requested.
7. **Tone and Style**: Maintain a professional and informative tone. Be friendly and approachable.
8. **Error Handling**: If a query is ambiguous or unclear, ask for clarification rather than providing a potentially incorrect answer.
9. **Fallback Options**: If the required information is not available in the provided context, provide a polite and helpful response. Example: "I don't have that information right now." or "I'm sorry, but I don't have that information. Is there something else I can help with?"

### Context:
<context>
{context}
</context>

### Example Responses:
User: Hi 
AI Response: 'Hello there! How can I assist you today?'

User: "What is Langchain?"
AI Response: "Langchain is a framework that enables the development of applications powered by large language models, such as chatbots."

User: "Can you explain how to use memory management in Langchain?"
AI Response: "Langchain's memory management involves utilizing built-in mechanisms to manage conversational context effectively, ensuring a coherent user experience."

User: "I need help with PyCaret's classification model."
AI Response: "PyCaret simplifies the process of building and deploying machine learning models. For classification tasks, you can use PyCaret's setup function to prepare your data, then compare and tune models."

Note: This system does not generate answers based solely on internal knowledge. It answers from the information provided in the user's current and previous inputs, and from explicitly referenced external sources.
"""

# def get_llm(model: str,max_tokens=CHAT_MAX_TOKENS) -> Any:
#     """Retrieve the specified language model based on the model name."""

#     model_versions = {
#         "OpenAI GPT 3.5": "gpt-3.5-turbo-16k",
#         "Gemini Pro": "gemini-1.0-pro-001",
#         "Gemini 1.5 Pro": "gemini-1.5-pro-preview-0409",
#         "OpenAI GPT 4": "gpt-4-0125-preview",
#         "Diffbot" : "gpt-4-0125-preview",
#         "OpenAI GPT 4o":"gpt-4o"
#          }

#     if model in model_versions:
#         model_version = model_versions[model]
#         logging.info(f"Chat Model: {model}, Model Version: {model_version}")

#         if "Gemini" in model:
#             llm = ChatVertexAI(
#                 model_name=model_version,
#                 convert_system_message_to_human=True,
#                 max_tokens=max_tokens,
#                 temperature=0,
#                 safety_settings={
#                     HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
#                     HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
#                     HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
#                     HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
#                     HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE
#                 }
#             )
#         else:
#             llm = ChatOpenAI(model=model_version, temperature=0,max_tokens=max_tokens)
#         return llm,model_version

#     else:
#         logging.error(f"Unsupported model: {model}")
#         return None,None

def get_neo4j_retriever(graph, index_name="vector", search_k=SEARCH_KWARG_K, score_threshold=SEARCH_KWARG_SCORE_THRESHOLD):
    try:
        neo_db = Neo4jVector.from_existing_index(
            embedding=EMBEDDING_FUNCTION,
            index_name=index_name,
            retrieval_query=RETRIEVAL_QUERY,
            graph=graph
        )
        logging.info(f"Successfully retrieved Neo4jVector index '{index_name}'")
        retriever = neo_db.as_retriever(search_kwargs={'k': search_k, "score_threshold": score_threshold})
        logging.info(f"Successfully created retriever for index '{index_name}' with search_k={search_k}, score_threshold={score_threshold}")
        return retriever
    except Exception as e:
        logging.error(f"Error retrieving Neo4jVector index '{index_name}' or creating retriever: {e}")
        return None 
    
def create_document_retriever_chain(llm,retriever):
    question_template= "Given the below conversation, generate a search query to look up in order to get information relevant to the conversation. Only respond with the query, nothing else."

    query_transform_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", question_template),
            MessagesPlaceholder(variable_name="messages")
        ]
    )
    output_parser = StrOutputParser()

    splitter = TokenTextSplitter(chunk_size=2000, chunk_overlap=0)
    # extractor = LLMChainExtractor.from_llm(llm)
    redundant_filter = EmbeddingsRedundantFilter(embeddings=EMBEDDING_FUNCTION)
    embeddings_filter = EmbeddingsFilter(embeddings=EMBEDDING_FUNCTION, similarity_threshold=0.35)

    pipeline_compressor = DocumentCompressorPipeline(
        transformers=[splitter,redundant_filter, embeddings_filter]
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

    return query_transforming_retriever_chain


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
    return None 

def format_documents(documents):
    sorted_documents = sorted(documents, key=lambda doc: doc.state["query_similarity_score"], reverse=True)
    sorted_documents = sorted_documents[:5] if len(sorted_documents) > 5 else sorted_documents
    formatted_docs = []
    sources = set()
    for i,doc in enumerate(sorted_documents):
        print("here")
        doc_start = f"Document start\n"
        formatted_doc = f"Content: {doc.page_content}"
        doc_end = f"\nDocument end\n"
        sources.add(doc.metadata['source'])
        final_formatted_doc = doc_start + formatted_doc + doc_end
        formatted_docs.append(final_formatted_doc)
    return "\n\n".join(formatted_docs), sources

def get_rag_chain(llm,system_template=SYSTEM_TEMPLATE):
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
    # sources_pattern = r"\[Sources: ([^\]]+)\]"
    # sources = re.search(sources_pattern, response)
    # content = re.sub(sources_pattern, '', response)
    # sources = sources.group(1).split(', ') if sources else []

    # source_pattern = r"\[Source: ([^\]]+)\]"
    # source = re.search(source_pattern, response)
    # content = re.sub(source_pattern, '', content)
    # source = source.group(1).split(', ') if source else []
    # sources.extend(source)

    docs_metadata = dict()
    for doc in docs:
        source = doc.metadata["source"]
        chunkids = doc.metadata["chunkIds"]
        page_numbers = doc.metadata["page_numbers"]
        docs_metadata[source] = [chunkids,page_numbers]
    chunkids = list()
    output_sources = list()
    for source in sources_used:
        if source in set(docs_metadata.keys()):
            chunkids.extend(docs_metadata[source][0])
            page_numbers = docs_metadata[source][1]
            current_source = {
                "source_name":source,
                "page_numbers":page_numbers if len(page_numbers) > 1 and page_numbers[0] is not None else [],
                "time_stamps":list()
            }
            output_sources.append(current_source)

    result = {
        'sources': output_sources,
        'chunkIds': chunkids
    }
    return result

def summarize_messages(llm,history,stored_messages):
    if len(stored_messages) == 0:
        return False
    # summarization_template = "Distill the below chat messages into a single summary message. Include as many specific details as you can."
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

def QA_RAG(graph,model,question,session_id):
    try:
        start_time = time.time()
        model_version = MODEL_VERSIONS[model]
        llm = get_llm(model_version)
        retriever = get_neo4j_retriever(graph=graph)
        doc_retriever = create_document_retriever_chain(llm,retriever)
        history = create_neo4j_chat_message_history(graph,session_id )
        chat_setup_time = time.time() - start_time
        logging.info(f"Chat setup completed in {chat_setup_time:.2f} seconds")
        
        start_time = time.time()
        messages = history.messages
        user_question = HumanMessage(content=question)
        messages.append(user_question)
        docs = doc_retriever.invoke(
            {
                "messages":messages
            }
        )
        formatted_docs,sources = format_documents(docs)
        doc_retrieval_time = time.time() - start_time
        logging.info(f"Modified question and Documents retrieved in {doc_retrieval_time:.2f} seconds")

        start_time = time.time()
        rag_chain = get_rag_chain(llm=llm)
        ai_response = rag_chain.invoke(
            {
            "messages" : messages[:-1],
            "context"  : formatted_docs,
            "input"    : question 
        }
        )
        result = get_sources_and_chunks(sources,docs)
        content = ai_response.content
        if "Gemini" in model:
            total_tokens = ai_response.response_metadata['usage_metadata']['prompt_token_count']
        else:    
            total_tokens = ai_response.response_metadata['token_usage']['total_tokens']
        predict_time = time.time() - start_time
        logging.info(f"Final Response predicted in {predict_time:.2f} seconds")

        start_time = time.time()
        messages.append(ai_response)
        summarize_messages(llm,history,messages)
        history_summarized_time = time.time() - start_time
        logging.info(f"Chat History summarized in {history_summarized_time:.2f} seconds")

        return {
            "session_id": session_id, 
            "message": content, 
            "info": {
                "sources": result["sources"],
                "model": model_version,
                "chunkids":result["chunkIds"],
                "total_tokens": total_tokens,
                "response_time": 0
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
                "error": f"{error_name} :- {str(e)}"
            },
            "user": "chatbot"}