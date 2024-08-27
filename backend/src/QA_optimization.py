import os
from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.chains import GraphCypherQAChain
from langchain.graphs import Neo4jGraph
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
import logging
from langchain_community.chat_message_histories import Neo4jChatMessageHistory
import asyncio   
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

# openai_api_key = os.environ.get('OPENAI_API_KEY')
# model_version='gpt-4-0125-preview'

class ParallelComponent:

    def __init__(self, uri, userName, password, question, session_id):
        self.uri = uri
        self.userName = userName
        self.password = password
        self.question = question
        self.session_id = session_id
        self.model_version='gpt-4-0125-preview'
        self.llm = ChatOpenAI(model= self.model_version, temperature=0)

    # async def execute(self):
    #     tasks = []

    #     tasks.append(asyncio.create_task(self._vector_embed_results()))
    #     tasks.append(asyncio.create_task(self._cypher_results()))
    #     tasks.append(asyncio.create_task(self._get_chat_history()))

    #     return await asyncio.gather(*tasks)
    async def execute(self):
        tasks = [
            self._vector_embed_results(),
            # self._cypher_results(), ## Disabled call for cypher_results
            self._get_chat_history()
        ]
        return await asyncio.gather(*tasks)

    async def _vector_embed_results(self):
        t=datetime.now()
        print("Vector embeddings start time",t)
        # retrieval_query="""
        # MATCH (node)-[:__PART_OF__]->(d:Document)
        # WITH d, apoc.text.join(collect(node.text),"\n----\n") as text, avg(score) as score
        # RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName)} as metadata
        # """
        retrieval_query="""
        WITH node, score, apoc.text.join([ (node)-[:__HAS_ENTITY__]->(e) | head(labels(e)) + ": "+ e.id],", ") as entities
        MATCH (node)-[:__PART_OF__]->(d:__Document__)
        WITH d, apoc.text.join(collect(node.text + "\n" + entities),"\n----\n") as text, avg(score) as score
        RETURN text, score, {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName)} as metadata
        """
        vector_res={}
        try:
            neo_db=Neo4jVector.from_existing_index(
                    embedding=OpenAIEmbeddings(),
                    url=self.uri,
                    username=self.userName,
                    password=self.password,
                    database="neo4j",
                    index_name="vector",
                    retrieval_query=retrieval_query,
                )
            # llm = ChatOpenAI(model= model_version, temperature=0)

            qa = RetrievalQA.from_chain_type(
                llm=self.llm, chain_type="stuff", retriever=neo_db.as_retriever(search_kwargs={'k': 3,"score_threshold": 0.5}), return_source_documents=True
            )

            result = qa({"query": self.question})
            vector_res['result']=result.get("result")
            list_source_docs=[]
            for i in result["source_documents"]:
                list_source_docs.append(i.metadata['source'])
                vector_res['source']=list_source_docs
        except Exception as e:
            error_message = str(e)
            logging.exception(f'Exception in vector embedding in QA component:{error_message}')
        #   raise Exception(error_message)
        print("Vector embeddings duration time",datetime.now()-t)
        return vector_res


    async def _cypher_results(self):
        try:
            t=datetime.now()
            print("Cypher QA start time",t)
            cypher_res={}
            graph = Neo4jGraph(
                        url=self.uri,
                        username=self.userName,
                        password=self.password
                    )
            

            graph.refresh_schema()
            cypher_chain = GraphCypherQAChain.from_llm(
                graph=graph,
                cypher_llm=ChatOpenAI(temperature=0, model=self.model_version),
                qa_llm=ChatOpenAI(temperature=0, model=self.model_version),
                validate_cypher=True, # Validate relationship directions
                verbose=True,
                top_k=2
            )
            try:
                cypher_res=cypher_chain.invoke({"query": question})
            except:
                cypher_res={}
            
        except Exception as e:
            error_message = str(e)
            logging.exception(f'Exception in CypherQAChain in QA component:{error_message}')
            #   raise Exception(error_message)
        print("Cypher QA duration",datetime.now()-t)
        return cypher_res

    async def _get_chat_history(self):
        try:
            t=datetime.now()
            print("Get chat history start time:",t)
            history = Neo4jChatMessageHistory(
            url=self.uri,
            username=self.userName,
            password=self.password,
            session_id=self.session_id
            )
            chat_history=history.messages

            if len(chat_history)==0:
                return {"result":""}
            condense_template = f"""Given the following earlier conversation , Summarise the chat history.Make sure to include all the relevant information.
                Chat History:
                {chat_history}"""
            chat_summary=self.llm.predict(condense_template)
            print("Get chat history duration time:",datetime.now()-t)
            return {"result":chat_summary}
        except Exception as e:
            error_message = str(e)
            logging.exception(f'Exception in retrieving chat history:{error_message}')
            # raise Exception(error_message)
            return {"result":''}
        
    async def final_prompt(self,chat_summary,cypher_res,vector_res):
            t=datetime.now()
            print('Final prompt start time:',t)
            final_prompt = f"""You are a helpful question-answering agent. Your task is to analyze
            and synthesize information from two sources: the top result from a similarity search
            (unstructured information) and relevant data from a graph database (structured information). 
            If structured information fails to find an answer then use the answer from unstructured information 
            and vice versa. I only want a straightforward answer without mentioning from which source you got the answer. You are also receiving 
            a chat history of the earlier conversation. You should be able to understand the context from the chat history and answer the question.
            Given the user's query: {self.question}, provide a meaningful and efficient answer based
            on the insights derived from the following data:
            chat_summary:{chat_summary}
            Structured information: {cypher_res}.
            Unstructured information: {vector_res}.

            """
            print(final_prompt)
            response = self.llm.predict(final_prompt)
            ai_message=response
            user_message=question
            print('Final prompt duration',datetime.now()-t)
            return ai_message,user_message


    async def _save_chat_history(self,ai_message,user_message):
        try:
            history = Neo4jChatMessageHistory(
            url=self.uri,
            username=self.userName,
            password=self.password,
            session_id=self.session_id
            )
            history.add_user_message(user_message)
            history.add_ai_message(ai_message)
            logging.info(f'Successfully saved chat history')
        except Exception as e:
            error_message = str(e)
            logging.exception(f'Exception in saving chat history:{error_message}')
            raise Exception(error_message)

# Usage example:

uri=os.environ.get('NEO4J_URI')
userName=os.environ.get('NEO4J_USERNAME')
password=os.environ.get('NEO4J_PASSWORD')
question='Do you know my name?'
session_id=2

async def main(uri,userName,password,question,session_id):
    t=datetime.now()
    parallel_component = ParallelComponent(uri, userName, password, question, session_id)
    f_results=await parallel_component.execute()
    print(f_results)
    # f_vector_result=f_results[0]['result']
    # f_cypher_result=f_results[1].get('result','')
    # f_chat_summary=f_results[2]['result']
    f_vector_result=f_results[0]['result']
    f_cypher_result = "" # Passing Empty string for cypher_result 
    f_chat_summary=f_results[1]['result']
    print(f_vector_result)
    print(f_cypher_result)
    print(f_chat_summary)
    ai_message,user_message=await parallel_component.final_prompt(f_chat_summary,f_cypher_result,f_vector_result)
    # print(asyncio.gather(asyncio.create_taskparallel_component.final_prompt(f_chat_summary,f_cypher_result,f_vector_result)))
    await parallel_component._save_chat_history(ai_message,user_message)
    print("Total Time taken:",datetime.now()-t)
    print("Response from AI:",ai_message)
# Run with an event loop
asyncio.run(main(uri,userName,password,question,session_id))