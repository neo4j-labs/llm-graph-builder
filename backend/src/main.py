from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
# from langchain.chains import GraphCypherQAChain
# from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from datetime import datetime
import os
import json
import csv
load_dotenv()

url =os.environ.get('NEO4J_URI')
username = os.environ.get('NEO4J_USERNAME')
password = os.environ.get('NEO4J_PASSWORD')
diffbot_api_key = os.environ.get('DIFFBOT_API_KEY')
diffbot_nlp = DiffbotGraphTransformer(diffbot_api_key=diffbot_api_key)
graph = Neo4jGraph(url=url, username=username, password=password)

def extract(file):
  try:
    start_time = datetime.now()
    with open('temp.pdf','wb') as f:
      f.write(file.file.read())
    loader = PyPDFLoader('temp.pdf')
    pages = loader.load_and_split()
    
    metadata = {"source": "local","filename": file.filename, "filesize":file.size }
    print(metadata)
    for i in range(0,len(pages)):
      pages[i]=Document(page_content=pages[i].page_content.replace('\n',' '), metadata=metadata)
    
    graph_documents = diffbot_nlp.convert_to_graph_documents(pages)
    # print(graph_documents)
    graph.add_graph_documents(graph_documents)

    graph.refresh_schema()
    nodes_created =len(graph_documents[0].nodes)
    relationships_created = len(graph_documents[0].relationships)

    end_time = datetime.now()
    processed_time = end_time - start_time
    
    output = {
        "nodeCount": nodes_created,
        "relationshipCount": relationships_created,
        "processingTime": processed_time.total_seconds(),
        "status" : "success"
    }
    
    return json.dumps(output)
  except Exception as e:
    print(e)
    return 'Failure'

def calculate_nodes_relationship(query_str):
  result = graph.query(query_str)
  return result

# chain = GraphCypherQAChain.from_llm(
#     cypher_llm=ChatOpenAI(temperature=0, model_name="gpt-4"),
#     qa_llm=ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo"),
#     graph=graph,
#     verbose=True,
# )

# # chain.run("What is machine learning")
# chain.run("Who is Mois Ture?")