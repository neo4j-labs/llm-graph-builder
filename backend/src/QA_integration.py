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
load_dotenv()

openai_api_key = os.environ.get('OPENAI_API_KEY')


# def get_embedding_function(embedding_model_name: str):
#     if embedding_model_name == "openai":
#         embedding_function = OpenAIEmbeddings()
#         dimension = 1536
#         logging.info(f"Embedding: Using OpenAI Embeddings , Dimension:{dimension}")
#     elif embedding_model_name == "vertexai":        
#         embedding_function = VertexAIEmbeddings(
#             model_name="textembedding-gecko@003"
#         )
#         dimension = 768
#         logging.info(f"Embedding: Using Vertex AI Embeddings , Dimension:{dimension}")
#     else:
#         embedding_function = SentenceTransformerEmbeddings(
#             model_name="all-MiniLM-L6-v2"#, cache_folder="/embedding_model"
#         )
#         dimension = 384
#         logging.info(f"Embedding: Using SentenceTransformer , Dimension:{dimension}")
#     return embedding_function

def get_llm(model : str):
    if model == "OpenAI GPT 3.5":
        model_version = "gpt-3.5-turbo-16k"
        logging.info(f"Chat Model: GPT 3.5, Model Version : {model_version}")
        llm = ChatOpenAI(model= model_version, temperature=0)
    
    elif model == "Gemini Pro" :
        # model_version = "gemini-1.0-pro"
        model_version = 'gemini-pro' 
        logging.info(f"Chat Model: Gemini , Model Version : {model_version}")
        llm = ChatVertexAI(model_name=model_version,
                convert_system_message_to_human=True,
                temperature=0,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE, 
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
    else: 
        ## for model == "OpenAI GPT 4" or model == "Diffbot" 
        model_version = "gpt-4-0125-preview"
        logging.info(f"Chat Model: GPT 4, Model Version : {model_version}")
        llm = ChatOpenAI(model= model_version, temperature=0)
    return llm

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

# def cypher_results(graph,question):
#     cypher_res={}
#     try:
#         graph.refresh_schema()
#         cypher_chain = GraphCypherQAChain.from_llm(
#             graph=graph,
#             cypher_llm=ChatOpenAI(temperature=0, model=model_version),
#             qa_llm=ChatOpenAI(temperature=0, model=model_version),
#             validate_cypher=True, # Validate relationship directions
#             verbose=True,
#             top_k=2
#         )
#         try:
#             cypher_res=cypher_chain.invoke({"query": question})
#         except:
#             cypher_res={}
        
#     except Exception as e:
#       error_message = str(e)
#       logging.exception(f'Exception in CypherQAChain in QA component:{error_message}')
#     #   raise Exception(error_message)

#     return cypher_res
    
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
        # raise Exception(error_message)
    

def get_chat_history(llm,uri,userName,password,session_id):
    try:
        history = Neo4jChatMessageHistory(
        url=uri,
        username=userName,
        password=password,
        session_id=session_id
        )
        chat_history=history.messages

        if len(chat_history)==0:
            return ""
        condense_template = f"""Given the following earlier conversation , Summarise the chat history.Make sure to include all the relevant information.
            Chat History:
            {chat_history}"""
        chat_summary=llm.predict(condense_template)
        return chat_summary
    except Exception as e:
        error_message = str(e)
        logging.exception(f'Exception in retrieving chat history:{error_message}')
        # raise Exception(error_message)
        return ''

def QA_RAG(uri,model,userName,password,question,session_id):
    try:
        retrieval_query="""
        MATCH (node)-[:PART_OF]->(d:Document)
        WITH d, apoc.text.join(collect(node.text),"\n----\n") as text, avg(score) as score
        RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName)} as metadata
        """
        embedding_model = os.getenv('EMBEDDING_MODEL')
        # embedding_model = "vertexai"
        embedding_function, _ = load_embedding_model(embedding_model)
        neo_db=Neo4jVector.from_existing_index(
                embedding = embedding_function,
                url=uri,
                username=userName,
                password=password,
                database="neo4j",
                index_name="vector",
                retrieval_query=retrieval_query,
            )

        llm = get_llm(model = model)

        qa = RetrievalQA.from_chain_type(
            llm=llm, 
            chain_type="stuff", 
            retriever=neo_db.as_retriever(search_kwargs={'k': 3,"score_threshold": 0.5}),
            return_source_documents=True
        )

        vector_res=vector_embed_results(qa,question)
        print('Response from Vector embeddings')
        print(vector_res)

        # Disable Cypher Chain QA
        # graph = Neo4jGraph(
        #     url=uri,
        #     username=userName,
        #     password=password
        # )
        # cypher_res= cypher_results(graph,question)
        # print('Response from CypherQAChain')
        # print(cypher_res)

        chat_summary=get_chat_history(llm,uri,userName,password,session_id)


        # final_prompt = f"""You are a helpful question-answering agent. Your task is to analyze
        # and synthesize information from two sources: the top result from a similarity search
        # (unstructured information) and relevant data from a graph database (structured information). 
        # If structured information fails to find an answer then use the answer from unstructured information 
        # and vice versa. I only want a straightforward answer without mentioning from which source you got the answer. You are also receiving 
        # a chat history of the earlier conversation. You should be able to understand the context from the chat history and answer the question.
        # Given the user's query: {question}, provide a meaningful and efficient answer based
        # on the insights derived from the following data:
        # chat_summary:{chat_summary}
        # Structured information:  .
        # Unstructured information: {vector_res.get('result','')}.
        # """ 

        final_prompt = f"""
        You are an AI-powered question-answering agent. Utilize your capabilities to access and process information from multiple sources.
        User Input: {question}
        Response Requirements: Provide a concise and direct answer. Use the chat history and any provided unstructured data to understand the context and deliver relevant responses. 
        Even if the user's input is a simple greeting, respond in a context-aware manner that acknowledges previous interactions.
        
        Chat History Summary: {chat_summary}
        Additional Unstructured Information: {vector_res.get('result', '')}

        Additionally if the provided context does not contain any information please provide an answer on your own based on your knowledge.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        if the answer is generated from the additional Unstructured Information please mention the Document source : {vector_res.get('source', '')} at the end the message
        and Finally I only want a straightforward answer.
        """

        print(final_prompt)
        response = llm.predict(final_prompt)
        print(response)
        ai_message=response
        user_message=question
        save_chat_history(uri,userName,password,session_id,user_message,ai_message)

        res={"session_id":session_id,"message":response,"user":"chatbot"}
        return res
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in in QA component:{error_message}')
    #   raise Exception(error_message)
      return {"session_id":session_id,"message":"Something went wrong","user":"chatbot"}

 