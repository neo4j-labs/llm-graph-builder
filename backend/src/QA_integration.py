from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.chains import GraphCypherQAChain
from langchain.graphs import Neo4jGraph
import os
from dotenv import load_dotenv
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
import logging
from langchain_community.chat_message_histories import Neo4jChatMessageHistory
load_dotenv()

openai_api_key = os.environ.get('OPENAI_API_KEY')
model_version='gpt-4-0125-preview'

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

def QA_RAG(uri,userName,password,question,session_id):
    try:
        retrieval_query="""
        MATCH (node)-[:PART_OF]->(d:Document)
        WITH d, apoc.text.join(collect(node.text),"\n----\n") as text, avg(score) as score
        RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName)} as metadata
        """

        neo_db=Neo4jVector.from_existing_index(
                embedding=OpenAIEmbeddings(),
                url=uri,
                username=userName,
                password=password,
                database="neo4j",
                index_name="vector",
                retrieval_query=retrieval_query,
            )
        llm = ChatOpenAI(model= model_version, temperature=0)

        qa = RetrievalQA.from_chain_type(
            llm=llm, chain_type="stuff", retriever=neo_db.as_retriever(search_kwargs={'k': 3,"score_threshold": 0.5}), return_source_documents=True
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

        final_prompt = f"""You are a helpful question-answering agent. Your task is to analyze
        and synthesize information from two sources: the top result from a similarity search
        (unstructured information) and relevant data from a graph database (structured information). 
        If structured information fails to find an answer then use the answer from unstructured information 
        and vice versa. I only want a straightforward answer without mentioning from which source you got the answer. You are also receiving 
        a chat history of the earlier conversation. You should be able to understand the context from the chat history and answer the question.
        Given the user's query: {question}, provide a meaningful and efficient answer based
        on the insights derived from the following data:
        chat_summary:{chat_summary}
        Structured information:  .
        Unstructured information: {vector_res.get('result','')}.

        """ 

        print(final_prompt)
        response = llm.predict(final_prompt)
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

 