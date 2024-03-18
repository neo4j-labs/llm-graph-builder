from langchain_community.vectorstores.neo4j_vector import Neo4jVector
from langchain.chains import GraphCypherQAChain
from langchain.graphs import Neo4jGraph
import os
from dotenv import load_dotenv
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
import logging
load_dotenv()

openai_api_key = os.environ.get('OPENAI_API_KEY')

def vector_embed_results(qa,question):
    vector_res={}
    try:
        # question ="What do you know about machine learning"
        result = qa({"query": question})
        vector_res['result']=result["result"]
        list_source_docs=[]
        for i in result["source_documents"]:
            list_source_docs.append(i.metadata['source'])
            vector_res['source']=list_source_docs
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in vector embedding in QA component:{error_message}')
      raise Exception(error_message)
    
    return vector_res

def cypher_results(graph,question,model_version):
    cypher_res={}
    try:
        graph.refresh_schema()
        cypher_chain = GraphCypherQAChain.from_llm(
            graph=graph,
            # cypher_llm=ChatOpenAI(temperature=0, model="gpt-4"),
            cypher_llm=ChatOpenAI(temperature=0, model=model_version),
            qa_llm=ChatOpenAI(temperature=0, model=model_version),
            validate_cypher=True, # Validate relationship directions
            verbose=True,
            top_k=2
        )

        cypher_res=cypher_chain.invoke({"query": question})
        
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in CypherQAChain in QA component:{error_message}')
      raise Exception(error_message)

    return cypher_res
    


def QA_RAG(uri,userName,password,model_version,question):
    try:
        if model_version=='OpenAI GPT 3.5':
            model_version='gpt-3.5-turbo'
        elif model_version=='OpenAI GPT 4':
            model_version='gpt-4-0125-preview'
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
            llm=llm, chain_type="stuff", retriever=neo_db.as_retriever(search_kwargs={"score_threshold": 0.5}), return_source_documents=True
        )

        graph = Neo4jGraph(
            url=uri,
            username=userName,
            password=password
        )
        vector_res=vector_embed_results(qa,question)
        print(vector_res)
        cypher_res= cypher_results(graph,question,model_version)
        print(cypher_res)
        final_prompt = f"""You are a helpful question-answering agent. Your task is to analyze
        and synthesize information from two sources: the top result from a similarity search
        (unstructured information) and relevant data from a graph database (structured information).
        Given the user's query: {question}, provide a meaningful and efficient answer based
        on the insights derived from the following data:
        Structured information: {cypher_res.get('result','')}.
        Unstructured information: {vector_res.get('result','')}.

        If structured information fails to find an answer then use the answer from unstructured information and vice versa. I only want a straightforward answer without mentioning from which source you got the answer.
        """
        print(final_prompt)
        response = llm.predict(final_prompt)
        res={"message":response,"user":"chatbot"}
        return res
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in in QA component:{error_message}')
      raise Exception(error_message)
