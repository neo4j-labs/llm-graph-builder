from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.chains import GraphCypherQAChain
from langchain.graphs import Neo4jGraph
import os

from dotenv import load_dotenv
from langchain.chains import RetrievalQA
from langchain.chains import RetrievalQAWithSourcesChain
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_vertexai import ChatVertexAI
from langchain_google_vertexai import HarmBlockThreshold, HarmCategory
import logging
from langchain_community.chat_message_histories import Neo4jChatMessageHistory
from langchain_community.embeddings.sentence_transformer import SentenceTransformerEmbeddings
from src.shared.common_fn import load_embedding_model
import re
from typing import Any
from datetime import datetime
import time

load_dotenv()

openai_api_key = os.environ.get('OPENAI_API_KEY')

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL')
EMBEDDING_FUNCTION , _ = load_embedding_model(EMBEDDING_MODEL)
CHAT_MAX_TOKENS = 1000


# RETRIEVAL_QUERY = """
# WITH node, score, apoc.text.join([ (node)-[:__HAS_ENTITY__]->(e) | head(labels(e)) + ": "+ e.id],", ") as entities
# MATCH (node)-[:__PART_OF__]->(d:Document)
# WITH d, apoc.text.join(collect(node.text + "\n" + entities),"\n----\n") as text, avg(score) as score
# RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName)} as metadata
# """

RETRIEVAL_QUERY = """
WITH node as chunk, score
MATCH (chunk)-[:__PART_OF__]->(d:__Document__)
CALL { WITH chunk
MATCH (chunk)-[:__HAS_ENTITY__]->(e) 
MATCH path=(e)(()-[rels:!__HAS_ENTITY__&!__PART_OF__]-()){0,3}(:!__Chunk__&!__Document__) 
UNWIND rels as r
RETURN collect(distinct r) as rels
}
WITH d, collect(distinct chunk) as chunks, avg(score) as score, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels
WITH d, score, 
[c in chunks | c.text] as texts,  
[r in rels | coalesce(apoc.coll.removeAll(labels(startNode(r)),['__Entity__'])[0],"") +":"+ startNode(r).id + " "+ type(r) + " " + coalesce(apoc.coll.removeAll(labels(endNode(r)),['__Entity__'])[0],"") +":" + endNode(r).id] as entities
WITH d, score,
apoc.text.join(texts,"\n----\n") +
apoc.text.join(entities,"\n")
as text, entities
RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), entities:entities} as metadata
"""

FINAL_PROMPT = """
You are an AI-powered question-answering agent tasked with providing accurate and direct responses to user queries. Utilize information from the chat history, current user input, and Relevant Information effectively.

Response Requirements:
- Deliver concise and direct answers to the user's query without headers unless requested.
- Acknowledge and utilize relevant previous interactions based on the chat history summary.
- Respond to initial greetings appropriately, but avoid including a greeting in subsequent responses unless the chat is restarted or significantly paused.
- For non-general questions, strive to provide answers using chat history and Relevant Information ONLY do not Hallucinate.
- Clearly state if an answer is unknown; avoid speculating.

Instructions:
- Prioritize directly answering the User Input: {question}.
- Use the Chat History Summary: {chat_summary} to provide context-aware responses.
- Refer to Relevant Information: {vector_result} only if it directly relates to the query.
- Cite sources clearly when using Relevant Information in your response [Sources: {sources}] without fail. The Source must be printed only at the last in the format [Source: source1,source2] . Duplicate sources should be removed.
Ensure that answers are straightforward and context-aware, focusing on being relevant and concise.
"""

def get_llm(model: str,max_tokens=1000) -> Any:
    """Retrieve the specified language model based on the model name."""

    model_versions = {
        "openai-gpt-3.5": "gpt-3.5-turbo-16k",
        "gemini-1.0-pro": "gemini-1.0-pro-001",
        "gemini-1.5-pro": "gemini-1.5-pro-preview-0409",
        "openai-gpt-4": "gpt-4-0125-preview",
        "diffbot" : "gpt-4-0125-preview",
        "openai-gpt-4o":"gpt-4o",
        "openai-gpt-4o-mini": "gpt-4o-mini",
         }
    if model in model_versions:
        model_version = model_versions[model]
        logging.info(f"Chat Model: {model}, Model Version: {model_version}")
        
        if "Gemini" in model:
            llm = ChatVertexAI(
                model_name=model_version,
                convert_system_message_to_human=True,
                max_tokens=max_tokens,
                temperature=0,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE
                }
            )
        else:
            llm = ChatOpenAI(model=model_version, temperature=0,max_tokens=max_tokens)

        return llm,model_version

    else:
        logging.error(f"Unsupported model: {model}")
        return None,None

def vector_embed_results(qa,question):
    vector_res={}
    try:
        result = qa({"query": question})
        vector_res['result']=result.get("result")

        sources = set()
        entities = set()
        for document in result["source_documents"]:
            sources.add(document.metadata["source"])
            for entiti in document.metadata["entities"]:
                entities.add(entiti)
        vector_res['source']=list(sources)
        vector_res['entities'] = list(entities)
        if len( vector_res['entities']) > 5:
            vector_res['entities'] =  vector_res['entities'][:5]
            
        # list_source_docs=[]
        # for i in result["source_documents"]:
        #     list_source_docs.append(i.metadata['source'])
        #     vector_res['source']=list_source_docs

        # result = qa({"question":question},return_only_outputs=True)
        # vector_res['result'] = result.get("answer")
        # vector_res["source"] = result.get("sources")
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in vector embedding in QA component:{error_message}')
    #   raise Exception(error_message)
    
    return vector_res
    
def save_chat_history(history,user_message,ai_message):
    try:
        # history = Neo4jChatMessageHistory(
        #     graph=graph,
        #     session_id=session_id
        # )
        history.add_user_message(user_message)
        history.add_ai_message(ai_message)
        logging.info(f'Successfully saved chat history')
    except Exception as e:
        error_message = str(e)
        logging.exception(f'Exception in saving chat history:{error_message}')
    
def get_chat_history(llm, history):
    """Retrieves and summarizes the chat history for a given session."""

    try:
        # history = Neo4jChatMessageHistory(
        #     graph=graph,
        #     session_id=session_id
        # )        
        chat_history = history.messages
        
        if not chat_history:
            return ""

        if len(chat_history) > 4:
            chat_history = chat_history[-4:]

        condense_template = f"""
        Given the following earlier conversation, summarize the chat history. 
        Make sure to include all relevant information.
        Chat History: {chat_history}
        """
        chat_summary = llm.predict(condense_template)
        return chat_summary

    except Exception as e:
        logging.exception(f"Exception in retrieving chat history: {e}")
        return "" 

def clear_chat_history(graph, session_id):

    try:
        logging.info(f"Clearing chat history for session ID: {session_id}")
        history = Neo4jChatMessageHistory(
            graph=graph,
            session_id=session_id
        )
        history.clear()
        logging.info("Chat history cleared successfully")

        return {
            "session_id": session_id,
            "message": "The chat history is cleared",
            "user": "chatbot"
        }
    except Exception as e:
        logging.exception(f"Error occurred while clearing chat history for session ID {session_id}: {e}")


def extract_and_remove_source(message):
    pattern = r'\[Source: ([^\]]+)\]'
    match = re.search(pattern, message)
    if match:
        sources_string = match.group(1)
        sources = [source.strip().strip("'") for source in sources_string.split(',')]
        new_message = re.sub(pattern, '', message).strip()
        response = {
            "message" : new_message,
            "sources" : sources
        }
    else:
        response = {
            "message" : message,
            "sources" : []
        }
    return response

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
    logging.info(f"QA_RAG called at {datetime.now()}")
    # model = "Gemini Pro"
    try:
        qa_rag_start_time = time.time()


        start_time = time.time()
        neo_db = Neo4jVector.from_existing_index(
            embedding=EMBEDDING_FUNCTION,
            index_name="vector",
            retrieval_query=RETRIEVAL_QUERY,
            graph=graph
        )

        history = Neo4jChatMessageHistory(
            graph=graph,
            session_id=session_id
        )
        
        llm,model_version = get_llm(model=model,max_tokens=CHAT_MAX_TOKENS)

        qa = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=neo_db.as_retriever(search_kwargs={'k': 3, "score_threshold": 0.7}),
            return_source_documents=True
        )
        # qa = RetrievalQAWithSourcesChain.from_chain_type(
        #     llm=llm,
        #     chain_type="stuff",
        #     retriever=neo_db.as_retriever(search_kwargs={'k': 3, "score_threshold": 0.7}))

        db_setup_time = time.time() - start_time
        logging.info(f"DB Setup completed in {db_setup_time:.2f} seconds")
        
        start_time = time.time()
        chat_summary = get_chat_history(llm,history)
        chat_history_time = time.time() - start_time
        logging.info(f"Chat history summarized in {chat_history_time:.2f} seconds")
        # print(chat_summary)

        start_time = time.time()
        vector_res = vector_embed_results(qa, question)
        vector_time = time.time() - start_time
        logging.info(f"Vector response obtained in {vector_time:.2f} seconds")
        # print(vector_res)
        
        formatted_prompt = FINAL_PROMPT.format(
            question=question,
            chat_summary=chat_summary,
            vector_result=vector_res.get('result', ''),
            sources=vector_res.get('source', '')
        )
        # print(formatted_prompt)

        start_time = time.time()
        # llm = get_llm(model=model,embedding=False)
        response = llm.predict(formatted_prompt)
        predict_time = time.time() - start_time
        logging.info(f"Response predicted in {predict_time:.2f} seconds")

        start_time = time.time()
        ai_message = response
        user_message = question
        save_chat_history(history, user_message, ai_message)
        chat_history_save = time.time() - start_time
        logging.info(f"Chat History saved in {chat_history_save:.2f} seconds")
        
        response_data = extract_and_remove_source(response)
        message = response_data["message"]
        sources = response_data["sources"]
        
        print(f"message : {message}")
        print(f"sources : {sources}")
        total_call_time = time.time() - qa_rag_start_time
        logging.info(f"Total Response time is  {total_call_time:.2f} seconds")
        return {
            "session_id": session_id, 
            "message": message, 
            "info": {
                "sources": sources,
                "model":model_version,
                "entities":vector_res["entities"]
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
                "error": f"{error_name} :- {str(e)}"
            },
            "user": "chatbot"}
    




