from llm_graph_transformer.openAI_llm import *
from dotenv import load_dotenv
import os
from langchain_community.graphs import Neo4jGraph
load_dotenv()

url =os.environ.get('NEO4J_URI')
userName = os.environ.get('NEO4J_USERNAME')
password = os.environ.get('NEO4J_PASSWORD')
model=os.environ.get('LLM_MODEL')
graph = Neo4jGraph()
file_path='/workspaces/llm-graph-builder/data/Football_news.pdf'
extract_graph_from_file(url, userName, password, file_path, model)