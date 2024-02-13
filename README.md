# llm_graph_transformer
## Functions/Modules

# extract_graph_from_file(uri, userName, password, file_path, model):
   Extracts a Neo4jGraph from a PDF file based on the model.
   
    Args:
   	 uri: URI of the graph to extract
   	 userName: Username to use for graph creation ( if None will use username from config file )
   	 password: Password to use for graph creation ( if None will use password from config file )
   	 file: File object containing the PDF file path to be used
   	 model: Type of model to use ('OpenAI GPT 3.5' or 'OpenAI GPT 4')
   
     Returns: 
   	 Json response to API with fileName, nodeCount, relationshipCount, processingTime, 
     status and model as attributes.

# get_source_list_from_graph(graph):
   
   Creates a list of sources
   
    Args:
        graph: Neo4j graph object
    Returns:
         Returns a list of sources that are in the database by querying the graph and 
         sorting the list by the last updated date. 

# create_source_node_graph(uri, userName, password, file):

   Creates a source node in Neo4jGraph and sets properties.
   
    Args:
   	 uri: URI of Graph Service to connect to
   	 userName: Username to connect to Graph Service with ( default : None )
   	 password: Password to connect to Graph Service with ( default : None )
   	 file: File object with information about file to be added
   
    Returns: 
   	 Success or Failure message of node creation

## Usage example

from llm_graph_transformer.openAI_llm import *\
from dotenv import load_dotenv\
import os\
from langchain_community.graphs import Neo4jGraph\
load_dotenv()\

url =os.environ.get('NEO4J_URI')\
userName = os.environ.get('NEO4J_USERNAME')\
password = os.environ.get('NEO4J_PASSWORD')\
model=os.environ.get('LLM_MODEL')\
graph = Neo4jGraph()\
file_path='/workspaces/llm-graph-builder/data/Football_news.pdf'\
extract_graph_from_file(url, userName, password, file_path, model)


