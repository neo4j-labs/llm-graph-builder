from src.main import *
from fastapi import UploadFile, File
from tempfile import NamedTemporaryFile
import logging
import logging
from langchain_community.document_loaders import WikipediaLoader
from src.api_response import create_api_response
from langchain_community.document_loaders import S3DirectoryLoader
import logging
import boto3
import os
from urllib.parse import urlparse
from src.QA_integration import QA_RAG

uri =''
userName =''
password =''
model ='OpenAI GPT 3.5'
database =''
gcs_bucket_name = ''
gcs_bucket_folder = ''
gcs_blob_filename = ''
source_url = ''
aws_access_key_id = ''
aws_secret_access_key = ''


graph = create_graph_database_connection(uri, userName, password, database)

def extract_graph_from_file_local_file_test():
    shutil.copyfile('data/Copy01_patrick_pichette_-_wikipedia.pdf', 'backend/src/merged_files/Copy01_patrick_pichette_-_wikipedia.pdf')
    local_file_result =  extract_graph_from_file_local_file(
           graph,
           model,
           "Copy01_patrick_pichette_-_wikipedia.pdf"
    )
    print(local_file_result)
    #print(local_file_result['nodeCount'])
    logging.info("Info:  ")
    

    try:
        assert local_file_result['status'] == 'Completed' and local_file_result['nodeCount']>30 and local_file_result['relationshipCount']>20
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)



#   Check for Wikipedia file to be success
def extract_graph_from_Wikipedia(uri, userName, password, model,database):
    # uploadFile = create_upload_file('/workspaces/llm-graph-builder/data/Football_news.pdf')
    wikiresult =  extract_graph_from_file_Wikipedia(
             graph,
            model,
            'Microsoft Azure',
            1)

    logging.info("Info: Wikipedia test done")
    print(wikiresult)
    
    try:
        assert wikiresult['status'] == 'Completed' and wikiresult['nodeCount']>35 and wikiresult['relationshipCount']>30
        print("Success")
    except AssertionError as e:
        print("Fail ", e)

    #   Check for Wikipedia file to be Failed
def get_documents_from_Wikipedia(wiki_query:str):
  file_name=''


  try:
    pages = WikipediaLoader(query=wiki_query.strip(), load_max_docs=1, load_all_available_meta=False).load()
    file_name = wiki_query.strip()
    logging.info(f"Total Pages from Wikipedia = {len(pages)}")
    print(file_name,pages)
    assert True
     
    #return file_name, pages
  except Exception as e:
    job_status = "Failed"
    message="Failed To Process Wikipedia Query"
    error_message = str(e)
    print(error_message)
      
  
  #   Check for Wikipedia file to be Failed
def extract_graph_from_Wikipedia_fail(uri, userName, password, model,database):
    # uploadFile = create_upload_file('/workspaces/llm-graph-builder/data/Football_news.pdf')
    wikiresults =  extract_graph_from_file_Wikipedia(
             graph,
            model,
            '  ',
            1)
   
    logging.info("Info: Wikipedia test done")
    print(wikiresults)
    #result = False
    try:
        assert wikiresults['status'] == 'Completed'
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
    
    # assert result['status'] == 'Failed'

# Check for Youtube_video to be Success

def extract_graph_from_youtube_video(uri, userName, password, model, database):
    youtuberesult =  extract_graph_from_file_youtube(
            graph,
            model,
            'https://www.youtube.com/watch?v=NKc8Tr5_L3w'
            )
    # print(result)
    logging.info("Info: Youtube Video test done")
    print(youtuberesult)
    try:
        assert youtuberesult['status'] == 'Completed' and youtuberesult['nodeCount']>60 and youtuberesult['relationshipCount']>50
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
    

# Check for Youtube_video to be Failed

def extract_graph_from_youtube_video_fail(uri, userName, password, model, database):
    youtuberesults =  extract_graph_from_file_youtube(
             uri,
            userName,
            password,
            model,
            database,
            'https://www.youtube.com/watch?v=U9mJuUkhUzk'
            )
    # print(result)
    print(youtuberesults)
    try:
        assert youtuberesults['status'] == 'Completed'
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
    

# Check for the GCS file to be uploaded, process and completed

def extract_graph_from_file_test_gcs(uri, userName, password, model, database):
    gcsresult =  extract_graph_from_file_gcs(
            graph,
            model,
            'llm_graph_transformer_test',
            'technology',
            'Neuralink brain chip patient playing chess.pdf'
            )

    # print(result)
    logging.info("Info")
    print(gcsresult)
    
    try:
        assert gcsresult['status'] == 'Completed' and gcsresult['nodeCount']>10 and gcsresult['relationshipCount']>5
        print("Success")
    except AssertionError as e:
        print("Failed ", e)

    # print(gcsresult)
    # assert gcsresult['status'] == 'Completed'
def extract_graph_from_file_test_s3(uri, userName, password, model, database):
    s3result = extract_graph_from_file_s3(
        graph,
        model,
        "s3://development-llm-graph-builder-models/data/Sundar_Pichai_Gemini.pdf",
        "",
        ""
    )
    # Print Result
    logging.info("Info")
    print(s3result)
    ####
# def get_documents_from_s3(s3_url, aws_access_key_id, aws_secret_access_key):
#     try:
#       parsed_url = urlparse(s3_url)
#       bucket = parsed_url.netloc
#       file_key = parsed_url.path.lstrip('/')
#       file_name=file_key.split('/')[-1]
#       s3=boto3.client('s3',aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
#       response=s3.head_object(Bucket=bucket,Key=file_key)
#       file_size=response['ContentLength']
      
#       logging.info(f'bucket : {bucket},file_name:{file_name},  file key : {file_key},  file size : {file_size}')
#       pages=get_s3_pdf_content(s3_url,aws_access_key_id=aws_access_key_id,aws_secret_access_key=aws_secret_access_key)
#       return file_name,pages
#     except Exception as e:
#       error_message = str(e)
#       logging.exception(f'Exception in reading content from S3:{error_message}')
#       raise Exception(error_message) 

# Check the Functionality of Chatbot QnA
def chatbot_QnA(uri, userName, password, model, database):
    QA_n_RAG = QA_RAG(
        uri,
        model,
        userName,
        password,
        'who is patrick pichette',
        1
        
    )
    #logging.info(f"QA_RAG called at {datetime.now()}")
    print(QA_n_RAG)
    print(len(QA_n_RAG['message']))
    try:
        assert len(QA_n_RAG['message']) > 10
        print("Success")
    except AssertionError as e:
        print("Failed ", e)


if __name__ == "__main__":

        extract_graph_from_file_local_file_test()
        extract_graph_from_Wikipedia(uri, userName, password, model,database)
        get_documents_from_Wikipedia("  ")
        # extract_graph_from_Wikipedia_fail(uri, userName, password, model,database)
        extract_graph_from_youtube_video(uri, userName, password, model, database)
        #extract_graph_from_youtube_video_fail(uri, userName, password, model, database)
        extract_graph_from_file_test_gcs(uri, userName, password, model, database)
        #extract_graph_from_file_test_s3(uri, userName, password, model, database)
        chatbot_QnA(uri, userName, password, model, database)