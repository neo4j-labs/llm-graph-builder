import json
import asyncio
import os
import shutil
import logging
import pandas as pd
from datetime import datetime as dt
from dotenv import load_dotenv
# from score import *
from src.main import *
from src.QA_integration import QA_RAG
from langserve import add_routes
from src.ragas_eval import get_ragas_metrics
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import answer_relevancy, context_utilization, faithfulness
# Load environment variables if needed
load_dotenv()
import os 
URI = os.getenv('NEO4J_URI')
USERNAME = os.getenv('NEO4J_USERNAME')
PASSWORD = os.getenv('NEO4J_PASSWORD')
DATABASE = os.getenv('NEO4J_DATABASE')

CHUNK_DIR = os.path.join(os.path.dirname(__file__), "chunks")
MERGED_DIR = os.path.join(os.path.dirname(__file__), "merged_files")

# Initialize database connection
graph = create_graph_database_connection(URI,USERNAME,PASSWORD,DATABASE)

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

def delete_extracted_files(file_path):
    """Delete the extracted files once extraction process is completed"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logging.info(f"Deleted file:{file_path}")
        else:
            logging.warning(f"File not found for deletion: {file_path}")
    except Exception as e:
        logging.error(f"Failed to delete file {file_path}. Error: {e}")

def test_graph_from_file_local(model_name):
   """Test graph creation from a local file."""
   file_name = 'About Amazon.pdf'
   shutil.copyfile('/workspaces/llm-graph-builder/backend/files/About Amazon.pdf',
                   os.path.join(MERGED_DIR, file_name))

   create_source_node_local(graph, model_name, file_name)
   merged_file_path = os.path.join(MERGED_DIR, file_name)

   local_file_result = asyncio.run(extract_graph_from_file_local_file(
       URI, USERNAME, PASSWORD, DATABASE, model_name, merged_file_path, file_name, '', '',None))
   logging.info("Local file processing complete")
   print(local_file_result)
   return local_file_result

#    try:
#        assert local_file_result['status'] == 'Completed'
#        assert local_file_result['nodeCount'] > 0
#        assert local_file_result['relationshipCount'] > 0
#        print("Success")
#    except AssertionError as e:
#        print("Fail: ", e)

    # Delete the file after processing
#    delete_extracted_fiKles(merged_file_path)

   #return local_file_result

def test_graph_from_wikipedia(model_name):
   # try:
       """Test graph creation from a Wikipedia page."""
       wiki_query = 'https://en.wikipedia.org/wiki/Berkshire_Hathaway'
       source_type = 'Wikipedia'
       file_name = "Berkshire_Hathaway"
       create_source_node_graph_url_wikipedia(graph, model_name, wiki_query, source_type)

       wiki_result = asyncio.run(extract_graph_from_file_Wikipedia(URI, USERNAME, PASSWORD, DATABASE, model_name, file_name, 'en',file_name, '', '',None))
       logging.info("Wikipedia test done")
       print(wiki_result)
       try:
           assert wiki_result['status'] == 'Completed'
           assert wiki_result['nodeCount'] > 0
           assert wiki_result['relationshipCount'] > 0
           print("Success")
       except AssertionError as e:
           print("Fail: ", e)
  
       return wiki_result
   # except Exception as ex:
   #     print(ex)

def test_graph_website(model_name):
   """Test graph creation from a Website page."""
    #graph, model, source_url, source_type
   source_url = 'https://www.amazon.com/'
   source_type = 'web-url'
   file_name = []
   create_source_node_graph_web_url(graph, model_name, source_url, source_type)

   weburl_result = asyncio.run(extract_graph_from_web_page(URI, USERNAME, PASSWORD, DATABASE, model_name, source_url,file_name, '', '',None))
   logging.info("WebUrl test done")
   print(weburl_result)

   try:
       assert weburl_result['status'] == 'Completed'
       assert weburl_result['nodeCount'] > 0
       assert weburl_result['relationshipCount'] > 0
       print("Success")
   except AssertionError as e:
       print("Fail: ", e)
   return weburl_result

def test_graph_website(model_name):
    """Test graph creation from a Website page."""
     #graph, model, source_url, source_type
    source_url = 'https://www.amazon.com/'
    source_type = 'web-url'
    create_source_node_graph_web_url(graph, model_name, source_url, source_type)

    weburl_result = extract_graph_from_web_page(URI, USERNAME, PASSWORD, DATABASE, model_name, source_url, '', '')
    logging.info("WebUrl test done")
    print(weburl_result)

    try:
        assert weburl_result['status'] == 'Completed'
        assert weburl_result['nodeCount'] > 0
        assert weburl_result['relationshipCount'] > 0
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)
    return weburl_result


def test_graph_from_youtube_video(model_name):
   """Test graph creation from a YouTube video."""
   source_url = 'https://www.youtube.com/watch?v=T-qy-zPWgqA'
   source_type = 'youtube'
   create_source_node_graph_url_youtube(graph, model_name, source_url, source_type)
   youtube_result = extract_graph_from_file_youtube(
       URI, USERNAME, PASSWORD, DATABASE, model_name, source_url, '', ''
   )
   logging.info("YouTube Video test done")
   print(youtube_result)

   try:
       assert youtube_result['status'] == 'Completed'
       assert youtube_result['nodeCount'] > 1
       assert youtube_result['relationshipCount'] > 1
       print("Success")
   except AssertionError as e:
       print("Failed: ", e)

   return youtube_result

def test_chatbot_qna(model_name, mode='vector'):
   """Test chatbot QnA functionality for different modes."""
   QA_n_RAG = QA_RAG(graph, model_name, 'Tell me about amazon', '[]', 1, mode)
   print(QA_n_RAG)
   print(len(QA_n_RAG['message']))


   try:
       assert len(QA_n_RAG['message']) > 20
       return QA_n_RAG
       print("Success")
   except AssertionError as e:
       print("Failed ", e)
       return QA_n_RAG
  
#Get Test disconnected_nodes list
def disconected_nodes():
   #graph = create_graph_database_connection(uri, userName, password, database)
   graphDb_data_Access = graphDBdataAccess(graph)
   nodes_list, total_nodes = graphDb_data_Access.list_unconnected_nodes()
   print(nodes_list[0]["e"]["elementId"])
   status = "False"
   if total_nodes['total']>0:
       status = "get_unconnected_nodes_list.. records loaded successfully"
   else:
       status = "get_unconnected_nodes_list ..records not loaded"
   return nodes_list[0]["e"]["elementId"], status
  
#Test Delete delete_disconnected_nodes list
def delete_disconected_nodes(lst_element_id):
   print(f'disconnect elementid list {lst_element_id}')
   #graph = create_graph_database_connection(uri, userName, password, database)
   graphDb_data_Access = graphDBdataAccess(graph)
   result = graphDb_data_Access.delete_unconnected_nodes(json.dumps(lst_element_id))
   print(f'delete disconnect api result {result}')
   if not result:
       return "delete_unconnected_nodes..Succesfully deleted first index of disconnected nodes"
   else:
       return "delete_unconnected_nodes..Unable to delete Nodes"

#Test Get Duplicate_nodes
def get_duplicate_nodes():
       #graph = create_graph_database_connection(uri, userName, password, database)
       graphDb_data_Access = graphDBdataAccess(graph)
       nodes_list, total_nodes = graphDb_data_Access.get_duplicate_nodes_list()
       if total_nodes['total']>0:
           return "Data successfully loaded"
       else:
           return "Unable to load data"
      
#Test populate_graph_schema
def test_populate_graph_schema_from_text(model_name):
    schema_text =('Amazon was founded on July 5, 1994, by Jeff Bezos in Bellevue, Washington.The company originally started as an online marketplace for books but gradually expanded its offerings to include a wide range of product categories. This diversification led to it being referred.')
    #result_schema=''
    try:
        result_schema = populate_graph_schema_from_text(schema_text, model_name, True)
        print(result_schema)
        return result_schema
    except Exception as e:
       print("Failed to get schema from text", e)
       return e

def run_tests():
   final_list = []
   error_list = []
   
   models = ['openai_gpt_3_5','openai_gpt_4o','openai_gpt_4o_mini','azure-ai-gpt-35','azure-ai-gpt-4o','gemini_1_5_pro','gemini_1_5_flash','anthropic-claude-3-5-sonnet','bedrock-claude-3-5-sonnet','groq-llama3-70b','fireworks-llama-v3-70b']

   for model_name in models:
       try:
                final_list.append(test_graph_from_file_local(model_name))
                final_list.append(test_graph_from_wikipedia(model_name))
                final_list.append(test_graph_website(model_name))
                final_list.append(test_populate_graph_schema_from_text(model_name))
                final_list.append(test_graph_from_youtube_video(model_name))
                final_list.append(test_chatbot_qna(model_name))
                final_list.append(test_chatbot_qna(model_name, mode='vector'))
                final_list.append(test_chatbot_qna(model_name, mode='graph+vector'))
                final_list.append(test_chatbot_qna(model_name, mode='fulltext'))
                final_list.append(test_chatbot_qna(model_name, mode='graph+vector+fulltext'))
                final_list.append(test_chatbot_qna(model_name, mode='entity search+vector'))
                
       except Exception as e:
           error_list.append((model_name, str(e)))

#    test_populate_graph_schema_from_text('openai-gpt-4o')
#delete diconnected nodes
   dis_elementid, dis_status = disconected_nodes()
   lst_element_id = [dis_elementid]
   delt = delete_disconected_nodes(lst_element_id)
#    dup = get_duplicate_nodes()
   print(final_list)
   schma = test_populate_graph_schema_from_text(model_name)
   # Save final results to CSV
   df = pd.DataFrame(final_list)
   print(df)
   df['execution_date'] = dt.today().strftime('%Y-%m-%d')
#diconnected nodes   
   df['disconnected_nodes']=dis_status
#    df['get_duplicate_nodes']=dup

   df['delete_disconected_nodes']=delt
   df['test_populate_graph_schema_from_text'] = schma
   df.to_csv(f"Integration_TestResult_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

   # Save error details to CSV
   df_errors = pd.DataFrame(error_list, columns=['Model', 'Error'])
   df_errors['execution_date'] = dt.today().strftime('%Y-%m-%d')
   df_errors.to_csv(f"Error_details_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

if __name__ == "__main__":
   run_tests()