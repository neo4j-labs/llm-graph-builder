import json
import asyncio
import os
import shutil
import logging
import pandas as pd
from datetime import datetime as dt
from dotenv import load_dotenv
from src.main import *
from src.QA_integration import QA_RAG
from src.ragas_eval import get_ragas_metrics
from datasets import Dataset
# Load environment variables
load_dotenv()
URI = os.getenv('NEO4J_URI')
USERNAME = os.getenv('NEO4J_USERNAME')
PASSWORD = os.getenv('NEO4J_PASSWORD')
DATABASE = os.getenv('NEO4J_DATABASE')
# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
# Directory Paths
BASE_DIR = os.path.dirname(__file__)
CHUNK_DIR = os.path.join(BASE_DIR, "chunks")
MERGED_DIR = os.path.join(BASE_DIR, "merged_files")
# Initialize Neo4j connection
graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)

def create_source_node_local(graph, model, file_name):
   """Creates a source node for a local file."""
   source_node = sourceNode()
   source_node.file_name = file_name
   source_node.file_type = 'pdf'
   source_node.file_size = '1087'
   source_node.file_source = 'local file'
   source_node.model = model
   source_node.created_at = dt.now()
   graphDB_data_Access = graphDBdataAccess(graph)
   graphDB_data_Access.create_source_node(source_node)
   return source_node


def test_graph_from_file_local(model_name):
   """Tests graph creation from a local file."""
   try:
       file_name = 'About Amazon.pdf'
       merged_file_path = os.path.join(MERGED_DIR, file_name)
       shutil.copyfile('/workspaces/llm-graph-builder/backend/files/About Amazon.pdf', merged_file_path)
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       create_source_node_local(graph, model_name, file_name)
       result = asyncio.run(
           extract_graph_from_file_local_file(
               URI, USERNAME, PASSWORD, DATABASE, model_name, merged_file_path, file_name, '', '', None, ''
           )
       )
       logging.info(f"Local file test result: {result}")
       return result
   except Exception as e:
       logging.error(f"Error in test_graph_from_file_local: {e}")
       return {"status": "Failed", "error": str(e)}

def test_graph_from_wikipedia(model_name):
   """Tests graph creation from a Wikipedia page."""
   try:
       wiki_query = 'https://en.wikipedia.org/wiki/Apollo_program'
       file_name = 'Apollo_program'
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       create_source_node_graph_url_wikipedia(graph, model_name, wiki_query, "Wikipedia")
       result = asyncio.run(
           extract_graph_from_file_Wikipedia(
               URI, USERNAME, PASSWORD, DATABASE, model_name, file_name, 'en', file_name, '', '', None, ''
           )
       )
       logging.info(f"Wikipedia test result: {result}")
       return result
   except Exception as e:
       logging.error(f"Error in test_graph_from_wikipedia: {e}")
       return {"status": "Failed", "error": str(e)}
   
def test_graph_from_youtube_video(model_name):
   """Tests graph creation from a YouTube video."""
   try:
       source_url = 'https://www.youtube.com/watch?v=T-qy-zPWgqA'
       file_name = 'NKc8Tr5_L3w'
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       create_source_node_graph_url_youtube(graph, model_name, source_url, "youtube")
       result = asyncio.run(
           extract_graph_from_file_youtube(
               URI, USERNAME, PASSWORD, DATABASE, model_name, source_url, file_name, '', '', None, ''
           )
       )
       logging.info(f"YouTube video test result: {result}")
       if isinstance(result, dict) and result.get("status") == "Failed":
           return {"status": "Failed", "error": result.get("error", "Unknown error")}
       return result
   except Exception as e:
       logging.error(f"Error in test_graph_from_youtube_video: {e}")
       return {"status": "Failed", "error": str(e)}

def test_graph_website(model_name):
   """Tests graph creation from a Website page."""
   try:
       source_url = 'https://www.cloudskillsboost.google/'
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       create_source_node_graph_web_url(graph, model_name, source_url, "web-url")
       result = asyncio.run(
           extract_graph_from_web_page(
               URI, USERNAME, PASSWORD, DATABASE, model_name, source_url, "Google Cloud Skills Boost", '', '', None, ''
           )
       )
       logging.info(f"Web URL test result: {result}")
       if isinstance(result, dict) and result.get("status") == "Failed":
           return {"status": "Failed", "error": result.get("error", "Unknown error")}
       return result
   except Exception as e:
       logging.error(f"Error in test_graph_website: {e}")
       return {"status": "Failed", "error": str(e)}
   
def test_chatbot_qna(model_name, mode='vector'):
   """Tests chatbot QnA functionality."""
   try:
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       result = QA_RAG(graph, model_name, 'Tell me about Amazon', '[]', 1, mode)
    #    assert len(result['message']) > 20
       logging.info(f"Chatbot QnA test passed for mode: {mode}")
       return result
   except Exception as e:
       logging.error(f"Error in chatbot QnA: {e}")
       return {"status": "Failed", "error": str(e)}

def get_disconnected_nodes():
   """Fetches list of disconnected nodes."""
   try:
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       graphDb_data_Access = graphDBdataAccess(graph)
       nodes_list, total_nodes = graphDb_data_Access.list_unconnected_nodes()
       if not nodes_list:
          return None,"No records found"
       return nodes_list[0]["e"]["elementId"], "Records loaded successfully" if total_nodes['total'] > 0 else "No records found"
   except Exception as e:
       logging.error(f"Error in get_disconnected_nodes: {e}")
       return None, "Error fetching nodes"

def delete_disconnected_nodes(lst_element_id):
   """Deletes disconnected nodes from the graph."""
   try:
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       graphDb_data_Access = graphDBdataAccess(graph)
       result = graphDb_data_Access.delete_unconnected_nodes(json.dumps(lst_element_id))
       return "Successfully deleted disconnected nodes" if not result else "Failed to delete nodes"
   except Exception as e:
       logging.error(f"Error in delete_disconnected_nodes: {e}")
       return "Error in deletion"

def test_populate_graph_schema_from_text(model_name):
   """Tests schema population from text."""
   try:
       schema_text = "Amazon was founded on July 5, 1994, by Jeff Bezos in Bellevue, Washington."
       result_schema = populate_graph_schema_from_text(schema_text, model_name, True)
       logging.info(f"Schema test result: {result_schema}")
       return result_schema
   except Exception as e:
       logging.error(f"Error in populate_graph_schema_from_text: {e}")
       return {"status": "Failed", "error": str(e)}
   
def get_duplicate_nodes():
       #graph = create_graph_database_connection(uri, userName, password, database)
       graphDb_data_Access = graphDBdataAccess(graph)
       nodes_list, total_nodes = graphDb_data_Access.get_duplicate_nodes_list()
       if total_nodes['total']>0:
           return "Data successfully loaded"
       else:
           return "Unable to load data"
       
def run_tests():
   """Runs all integration tests and logs results."""
   extract_list = []
   extract_error_list = []
   chatbot_list = []
   chatbot_error_list = []
   other_api_list = []
   models = ['openai_gpt_4','openai_gpt_4o','openai_gpt_4o_mini','gemini_1.5_pro','gemini_1.5_flash','gemini_2.0_flash','bedrock_nova_micro_v1','bedrock_nova_lite_v1','bedrock_nova_pro_v1','fireworks_qwen72b_instruct']
   chatbot_modes = [
       "vector",
       "graph+vector",
       "fulltext",
       "graph+vector+fulltext",
       "entity search+vector"
   ]
   for model_name in models:
       logging.info(f"Starting tests for model: {model_name}")
       # Run each test independently to capture all errors
       for test_func, test_args in [
            (test_graph_from_file_local, [model_name]),
            (test_graph_from_wikipedia, [model_name]),
            (test_graph_from_youtube_video,[model_name]),
            (test_graph_website,[model_name]),
       ]:
           try:
               result = test_func(*test_args)
               if isinstance(result, dict) and result.get("status") == "Failed":
                   extract_error_list.append((model_name, test_func.__name__, result.get("error", "Unknown error")))
               else:
                   extract_list.append(result)
           except Exception as e:
               logging.error(f"Error in {test_func.__name__} for {model_name}: {e}")
               extract_error_list.append((model_name, test_func.__name__, str(e)))
       # Run all chatbot QnA modes
       for mode in chatbot_modes:
           try:
               result = test_chatbot_qna(model_name,mode=mode)
               if isinstance(result, dict) and result.get("status") == "Failed":
                   chatbot_error_list.append((model_name, f"test_chatbot_qna ({mode})", result.get("error", "Unknown error")))
               else:
                   chatbot_list.append(result)
           except Exception as e:
               logging.error(f"Error in test_chatbot_qna ({mode}) for {model_name}: {e}")
               chatbot_error_list.append((model_name, f"test_chatbot_qna ({mode})", str(e)))

       try:
            schema_result = test_populate_graph_schema_from_text(model_name)
            print("KAUSTUBH : ",schema_result)
            other_api_list.append({f"{model_name}":schema_result}) 
            print("other_api_list : ",other_api_list)
       except Exception as e:
           logging.error(f"Error in test_populate_graph_schema_from_text for {model_name}: {e}")
           other_api_list.append({f"{model_name}":str(e)}) 
   # Handle disconnected nodes separately
   try:
       dis_elementid, dis_status = get_disconnected_nodes()
       delete_status = delete_disconnected_nodes([dis_elementid]) if dis_elementid else "No disconnected nodes found"
   except Exception as e:
       dis_status, delete_status = "Error fetching nodes", "Error deleting nodes"
       logging.error(f"Error handling disconnected nodes: {e}")

   try:
       dup = get_duplicate_nodes()
   except Exception as e:
       dup = "Error getting duplicate nodes"
       logging.error(f"Error getting duplicate nodes: {e}")
   # Convert results to DataFrame
   df_extract = pd.DataFrame(extract_list)
   df_extract['execution_date'] = dt.today().strftime('%Y-%m-%d')
   df_extract.to_csv(f"test_results/Extract_Integration_TestResult_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

   df_chatbot = pd.DataFrame(chatbot_list)
   df_chatbot['execution_date'] = dt.today().strftime('%Y-%m-%d')
   df_chatbot.to_csv(f"test_results/chatbot_Integration_TestResult_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

   other_api_dict = {'disconnected_nodes':dis_status,'delete_disconnected_nodes' : delete_status,'get_duplicate_nodes':dup,'test_populate_graph_schema_from_text':other_api_list}
   with open(f"test_results/other_api_results_{dt.now().strftime('%Y%m%d_%H%M%S')}.txt", "w") as file:
        file.write(json.dumps(other_api_dict, indent=4))
   # Save errors
   if extract_error_list:
       df_errors = pd.DataFrame(extract_error_list, columns=['Model', 'Function', 'Error'])
       df_errors['execution_date'] = dt.today().strftime('%Y-%m-%d')
       df_errors.to_csv(f"test_results/Extract_Error_details_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)
   if chatbot_error_list:
       df_errors = pd.DataFrame(chatbot_error_list, columns=['Model', 'Function', 'Error'])
       df_errors['execution_date'] = dt.today().strftime('%Y-%m-%d')
       df_errors.to_csv(f"test_results/chatbot_Error_details_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)
   logging.info("All tests completed.")

if __name__ == "__main__":
   run_tests()
