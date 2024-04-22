from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.chains import GraphCypherQAChain
from langchain.graphs import Neo4jGraph
import os
from dotenv import load_dotenv
from langchain.chains import RetrievalQA
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


RETRIEVAL_QUERY = """
WITH node, score, apoc.text.join([ (node)-[:HAS_ENTITY]->(e) | head(labels(e)) + ": "+ e.id],", ") as entities
MATCH (node)-[:PART_OF]->(d:Document)
WITH d, apoc.text.join(collect(node.text + "\n" + entities),"\n----\n") as text, avg(score) as score
RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName)} as metadata
"""

FINAL_PROMPT = """
You are an AI-powered question-answering agent tasked with providing accurate and direct responses to user queries. Utilize information from the chat history, current user input, and relevant unstructured data effectively.

Response Requirements:
- Deliver concise and direct answers to the user's query without headers unless requested.
- Acknowledge and utilize relevant previous interactions based on the chat history summary.
- Respond to initial greetings appropriately, but avoid including a greeting in subsequent responses unless the chat is restarted or significantly paused.
- Clearly state if an answer is unknown; avoid speculating.

Instructions:
- Prioritize directly answering the User Input: {question}.
- Use the Chat History Summary: {chat_summary} to provide context-aware responses.
- Refer to Additional Unstructured Information: {vector_result} only if it directly relates to the query.
- Cite sources clearly when using unstructured data in your response [Sources: {sources}]. The Source must be printed only at the last in the format [Source: source1,source2]
Ensure that answers are straightforward and context-aware, focusing on being relevant and concise.
"""


def get_llm(model: str) -> Any:
    """Retrieve the specified language model based on the model name."""

    model_versions = {
        "OpenAI GPT 3.5": "gpt-3.5-turbo-16k",
        "Gemini Pro": "gemini-1.0-pro-001",
        "Gemini 1.5 Pro": "gemini-1.5-pro-preview-0409",
        "OpenAI GPT 4": "gpt-4-0125-preview",
        "Diffbot" : "gpt-4-0125-preview"
         }

    if model in model_versions:
        model_version = model_versions[model]
        logging.info(f"Chat Model: {model}, Model Version: {model_version}")
        
        if "Gemini" in model:
            llm = ChatVertexAI(
                model_name=model_version,
                convert_system_message_to_human=True,
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
            llm = ChatOpenAI(model=model_version, temperature=0)
        return llm

    else:
        logging.error(f"Unsupported model: {model}")
        return None

def vector_embed_results(qa,question):
    vector_res={}
    try:
        result = qa({"query": question})
        vector_res['result']=result.get("result")
        list_source_docs=[]
        for i in result["source_documents"]:
            list_source_docs.append(i.metadata['source'])
            vector_res['source']=list_source_docs
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in vector embedding in QA component:{error_message}')
    #   raise Exception(error_message)
    
    return vector_res
    
def save_chat_history(uri,userName,password,session_id,user_message,ai_message):
    try:
        history = Neo4jChatMessageHistory(
        url=uri,
        username=userName,
        password=password,
        session_id=session_id
        )
        history.add_user_message(user_message)
        history.add_ai_message(ai_message)
        logging.info(f'Successfully saved chat history')
    except Exception as e:
        error_message = str(e)
        logging.exception(f'Exception in saving chat history:{error_message}')
    
def get_chat_history(llm, uri, user_name, password, session_id):
    """Retrieves and summarizes the chat history for a given session."""
    try:
        history = Neo4jChatMessageHistory(
            url=uri,
            username=user_name,
            password=password,
            session_id=session_id
        )
        
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


def QA_RAG(uri,model,userName,password,question,session_id):
    logging.info(f"QA_RAG called at {datetime.now()}")
    try:
        qa_rag_start_time = time.time()

        start_time = time.time()
        neo_db = Neo4jVector.from_existing_index(
            embedding=EMBEDDING_FUNCTION,
            url=uri,
            username=userName,
            password=password,
            database="neo4j",
            index_name="vector",
            retrieval_query=RETRIEVAL_QUERY,
        )
        
        llm = get_llm(model=model)
        qa = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=neo_db.as_retriever(search_kwargs={'k': 3, "score_threshold": 0.5}),
            return_source_documents=True
        )

        db_setup_time = time.time() - start_time
        logging.info(f"DB Setup completed in {db_setup_time:.2f} seconds")
        
        start_time = time.time()
        vector_res = vector_embed_results(qa, question)
        vector_time = time.time() - start_time
        logging.info(f"Vector response obtained in {vector_time:.2f} seconds")
        
        start_time = time.time()
        chat_summary = get_chat_history(llm, uri, userName, password, session_id)
        chat_history_time = time.time() - start_time
        logging.info(f"Chat history summarized in {chat_history_time:.2f} seconds")
        
        formatted_prompt = FINAL_PROMPT.format(
            question=question,
            chat_summary=chat_summary,
            vector_result=vector_res.get('result', ''),
            sources=vector_res.get('source', '')
        )
        
        start_time = time.time()
        response = llm.predict(formatted_prompt)
        predict_time = time.time() - start_time
        logging.info(f"Response predicted in {predict_time:.2f} seconds")

        start_time = time.time()
        ai_message = response
        user_message = question
        save_chat_history(uri, userName, password, session_id, user_message, ai_message)
        chat_history_save = time.time() - start_time
        logging.info(f"Chat History saved in {chat_history_save:.2f} seconds")
        
        response_data = extract_and_remove_source(response)
        message = response_data["message"]
        sources = response_data["sources"]
        
        total_call_time = time.time() - qa_rag_start_time
        logging.info(f"Total Response time is  {total_call_time:.2f} seconds")
        return {
            "session_id": session_id, 
            "message": message, 
            "sources": sources, 
            "user": "chatbot"
            }

    except Exception as e:
        logging.exception(f"Exception in QA component at {datetime.now()}: {str(e)}")
        return {"session_id": session_id, 
        "message": "Something went wrong", 
        "sources": [], 
        "user": "chatbot"}

# def QA_RAG(uri,model,userName,password,question,session_id):
#     try:
#         neo_db=Neo4jVector.from_existing_index(
#                 embedding = EMBEDDING_FUNCTION,
#                 url=uri,
#                 username=userName,
#                 password=password,
#                 database="neo4j",
#                 index_name="vector",
#                 retrieval_query=RETRIEVAL_QUERY,
#             )
#         llm = get_llm(model = model)

#         qa = RetrievalQA.from_chain_type(
#             llm=llm, 
#             chain_type="stuff", 
#             retriever=neo_db.as_retriever(search_kwargs={'k': 3,"score_threshold": 0.5}),
#             return_source_documents=True
#         )

#         vector_res=vector_embed_results(qa,question)
#         print('Response from Vector embeddings')
#         print(vector_res)

#         chat_summary=get_chat_history(llm,uri,userName,password,session_id)


#         final_prompt = f"""
#             You are an AI-powered question-answering agent tasked with providing accurate and direct responses to user queries. Utilize information from the chat history, current user input, and relevant unstructured data effectively.

#             Response Requirements:
#             - Deliver concise and direct answers to the user's query without headers unless requested.
#             - Acknowledge and utilize relevant previous interactions based on the chat history summary.
#             - Respond to initial greetings appropriately, but avoid including a greeting in subsequent responses unless the chat is restarted or significantly paused.
#             - Clearly state if an answer is unknown; avoid speculating.

#             Instructions:
#             - Prioritize directly answering the User Input: {question}.
#             - Use the Chat History Summary: {chat_summary} to provide context-aware responses.
#             - Refer to Additional Unstructured Information: {vector_res.get('result', '')} only if it directly relates to the query.
#             - Cite sources clearly when using unstructured data in your response [Sources: {vector_res.get('source', '')}]. The Source must be printed only at the last in the format [Source: source1,source2]
#             Ensure that answers are straightforward and context-aware, focusing on being relevant and concise.
#         """ 

#         print(final_prompt)
#         llm = get_llm(model = model)
#         response = llm.predict(final_prompt)
#         # print(response)

#         ai_message=response
#         user_message=question
#         save_chat_history(uri,userName,password,session_id,user_message,ai_message)

#         reponse = extract_and_remove_source(response)
#         message = reponse["message"]
#         sources = reponse["sources"]
#         # print(extract_and_remove_source(response))
#         print(response)
#         res={"session_id":session_id,"message":message,"sources":sources,"user":"chatbot"}
#         return res
#     except Exception as e:
#       error_message = str(e)
#       logging.exception(f'Exception in in QA component:{error_message}')
#       message = "Something went wrong"
#       sources = []
#     #   raise Exception(error_message)  
#       return {"session_id":session_id,"message":message,"sources":sources,"user":"chatbot"}

