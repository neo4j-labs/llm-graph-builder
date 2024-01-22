
from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
import os
import io
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.graphs import Neo4jGraph
from langchain.docstore.document import Document
# from langchain.chains import GraphCypherQAChain
# from langchain_openai import ChatOpenAI
load_dotenv()

url =os.environ.get('neo_url')
username = os.environ.get('neo_username')
password = os.environ.get('neo_pwd')
diffbot_api_key = os.environ.get('diffbot_api_key')
diffbot_nlp = DiffbotGraphTransformer(diffbot_api_key=diffbot_api_key)
graph = Neo4jGraph(url=url, username=username, password=password)

def predict(filename):
  try:
    with open('temp.pdf','wb') as f:
      f.write(filename.read())
    loader = PyPDFLoader('temp.pdf')
    pages = loader.load_and_split()
    # print(pages)
    for i in range(0,len(pages)):
      pages[i]=Document(page_content=pages[i].page_content.replace('\n',' '), metadata={"source": "local"})

    graph_documents = diffbot_nlp.convert_to_graph_documents(pages)
    print(graph_documents)
    graph.add_graph_documents(graph_documents)

    graph.refresh_schema()

   
    return 'Success'
  except Exception as e:
    print(e)
    return 'Failure'

# chain = GraphCypherQAChain.from_llm(
#     cypher_llm=ChatOpenAI(temperature=0, model_name="gpt-4"),
#     qa_llm=ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo"),
#     graph=graph,
#     verbose=True,
# )

# # chain.run("What is machine learning")
# chain.run("Who is Mois Ture?")

