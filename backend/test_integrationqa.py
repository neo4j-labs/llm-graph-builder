from score import *
from src.main import *
import logging
from src.QA_integration_new import QA_RAG
from langserve import add_routes
import asyncio
import os
from dotenv import load_dotenv
import pandas as pd
from datetime import datetime as dt

uri = ''
userName = ''
password = ''
# model = 'openai-gpt-3.5'
database = 'neo4j'
CHUNK_DIR = os.path.join(os.path.dirname(__file__), "chunks")
MERGED_DIR = os.path.join(os.path.dirname(__file__), "merged_files")
graph = create_graph_database_connection(uri, userName, password, database)


def test_graph_from_file_local_file(model_name):
   model = model_name
   file_name = 'About Amazon.pdf'
   # shutil.copyfile('data/Bank of America Q23.pdf', 'backend/src/merged_files/Bank of America Q23.pdf')
   shutil.copyfile('/workspaces/llm-graph-builder/backend/files/About Amazon.pdf',
                   '/workspaces/llm-graph-builder/backend/merged_files/About Amazon.pdf')
   obj_source_node = sourceNode()
   obj_source_node.file_name = file_name
   obj_source_node.file_type = 'pdf'
   obj_source_node.file_size = '1087'
   obj_source_node.file_source = 'local file'
   obj_source_node.model = model
   obj_source_node.created_at = datetime.now()
   graphDb_data_Access = graphDBdataAccess(graph)
   graphDb_data_Access.create_source_node(obj_source_node)
   merged_file_path = os.path.join(MERGED_DIR, file_name)
   print(merged_file_path)


   local_file_result = extract_graph_from_file_local_file(uri, userName, password, database, model, merged_file_path, file_name, '', '')
   # final_list.append(local_file_result)
   print(local_file_result)

   logging.info("Info:  ")
   try:
       assert local_file_result['status'] == 'Completed' and local_file_result['nodeCount'] > 0 and local_file_result[
           'relationshipCount'] > 0
       return local_file_result
       print("Success")
   except AssertionError as e:
       print("Fail: ", e)
       return local_file_result
      

def test_graph_from_file_local_file_failed(model_name):
   model = model_name
   file_name = 'Not_exist.pdf'
   try:
       obj_source_node = sourceNode()
       obj_source_node.file_name = file_name
       obj_source_node.file_type = 'pdf'
       obj_source_node.file_size = '0'
       obj_source_node.file_source = 'local file'
       obj_source_node.model = model
       obj_source_node.created_at = datetime.now()
       graphDb_data_Access = graphDBdataAccess(graph)
       graphDb_data_Access.create_source_node(obj_source_node)

       local_file_result = extract_graph_from_file_local_file(graph, model, file_name, merged_file_path, '', '')

       print(local_file_result)
   except AssertionError as e:
       print('Failed due to file does not exist means not uploaded or accidentaly deleteled from server')
       print("Failed: Error from extract function ", e)

#   Check for Wikipedia file to be test
def test_graph_from_Wikipedia(model_name):
    model = model_name
    wiki_query = 'https://en.wikipedia.org/wiki/Ram_Mandir'
    source_type = 'Wikipedia'
    file_name = "Ram_Mandir"
    create_source_node_graph_url_wikipedia(graph, model, wiki_query, source_type)
    wikiresult = extract_graph_from_file_Wikipedia(uri, userName, password, database, model, file_name, 1, 'en', '', '')
    logging.info("Info: Wikipedia test done")
    print(wikiresult)
    
    try:
        assert wikiresult['status'] == 'Completed' and wikiresult['nodeCount'] > 0 and wikiresult['relationshipCount'] > 0
        return wikiresult
        print("Success")
    except AssertionError as e:
        print("Fail ", e)
        return wikiresult


def test_graph_from_Wikipedia_failed():
   wiki_query = 'Test QA 123456'
   source_type = 'Wikipedia'
   try:
       logging.info("Created source node for wikipedia")
       create_source_node_graph_url_wikipedia(graph, model, wiki_query, source_type)
   except AssertionError as e:
       print("Fail ", e)

# Check for Youtube_video to be Success
def test_graph_from_youtube_video(model_name):
    model = model_name
    source_url = 'https://www.youtube.com/watch?v=T-qy-zPWgqA'
    source_type = 'youtube'

    create_source_node_graph_url_youtube(graph, model, source_url, source_type)
    youtuberesult = extract_graph_from_file_youtube(uri, userName, password, database, model, source_url, '', '')

    logging.info("Info: Youtube Video test done")
    print(youtuberesult)
    try:
        assert youtuberesult['status'] == 'Completed' and youtuberesult['nodeCount'] > 1 and youtuberesult[
            'relationshipCount'] > 1
        return youtuberesult
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
        return youtuberesult

# Check for Youtube_video to be Failed

def test_graph_from_youtube_video_failed():
   url = 'https://www.youtube.com/watch?v=U9mJuUkhUzk'
   source_type = 'youtube'

   create_source_node_graph_url_youtube(graph, model, url, source_type)
   youtuberesult = extract_graph_from_file_youtube(graph, model, url, ',', ',')
   # print(result)
   print(youtuberesult)
   try:
       assert youtuberesult['status'] == 'Completed'
       return youtuberesult
   except AssertionError as e:
       print("Failed ", e)


# Check for the GCS file to be uploaded, process and completed

def test_graph_from_file_test_gcs():
   bucket_name = 'test'
   folder_name = 'test'
   source_type = 'gcs test bucket'
   file_name = 'Neuralink brain chip patient playing chess.pdf'
   create_source_node_graph_url_gcs(graph, model, bucket_name, folder_name, source_type)
   gcsresult = extract_graph_from_file_gcs(graph, model, bucket_name, folder_name, file_name, '', '')

   logging.info("Info")
   print(gcsresult)

   try:
       assert gcsresult['status'] == 'Completed' and gcsresult['nodeCount'] > 10 and gcsresult['relationshipCount'] > 5
       print("Success")
   except AssertionError as e:
       print("Failed ", e)


def test_graph_from_file_test_gcs_failed():
   bucket_name = 'llm_graph_test'
   folder_name = 'test'
   source_type = 'gcs bucket'
   # file_name = 'Neuralink brain chip patient playing chess.pdf'
   try:
       create_source_node_graph_url_gcs(graph, model, bucket_name, folder_name, source_type)
       print("GCS: Create source node failed due to bucket not exist")
   except AssertionError as e:
       print("Failed ", e)


def test_graph_from_file_test_s3_failed():
   source_url = 's3://development-llm-test/'
   try:
       create_source_node_graph_url_s3(graph, model, source_url, 'test123', 'pwd123')
       # assert result['status'] == 'Failed'
       # print("S3 created source node failed die to wrong access key id and secret")
   except AssertionError as e:
       print("Failed ", e)


# Check the Functionality of Chatbot QnA for mode 'graph+vector'
def test_chatbot_QnA(model_name):
    model = model_name
    QA_n_RAG = QA_RAG(graph, model, 'Tell me about amazon', '[]', 1, 'graph+vector')

    print(QA_n_RAG)
    print(len(QA_n_RAG['message']))
    try:
        assert len(QA_n_RAG['message']) > 20
        return QA_n_RAG
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
        return QA_n_RAG

# Check the Functionality of Chatbot QnA for mode 'vector'
def test_chatbot_QnA_vector(model_name):
    model = model_name
    QA_n_RAG_vector = QA_RAG(graph, model, 'Tell me about amazon', '[]', 1, 'vector')


    print(QA_n_RAG_vector)
    print(len(QA_n_RAG_vector['message']))
    try:
        assert len(QA_n_RAG_vector['message']) > 20
        return QA_n_RAG_vector
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
        return QA_n_RAG_vector


if __name__ == "__main__":
   final_list = []
   for model_name in ['openai-gpt-3.5','azure_ai_gpt_35','azure_ai_gpt_4o','anthropic_claude_3_5_sonnet','fireworks_llama_v3_70b','bedrock_claude_3_5_sonnet']:
       
       # local file
       response = test_graph_from_file_local_file(model_name)  
       final_list.append(response)

    #    # Wikipedia  Test
       response = test_graph_from_Wikipedia(model_name)  
       final_list.append(response)
  
    #     # Youtube  Test
       response= test_graph_from_youtube_video(model_name)  
       final_list.append(response)
    # #    print(final_list)
  
    #    # test_graph_from_file_test_gcs(model_name) # GCS  Test

    #    #chatbot 'graph+vector'
       response = test_chatbot_QnA(model_name)
       final_list.append(response)

    #     #chatbot 'vector'
       response = test_chatbot_QnA_vector(model_name)
       final_list.append(response)

       # test_graph_from_file_test_s3_failed() # S3 Failed Test Case
   df = pd.DataFrame(final_list)
   df['execution_date']= datetime.today().strftime('%Y-%m-%d')
   df.to_csv(f"Integration_TestResult_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)