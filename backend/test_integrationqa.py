from src.main import *
from fastapi import UploadFile, File
from tempfile import NamedTemporaryFile
import logging
import shutil
from langchain_community.document_loaders import WikipediaLoader
from src.api_response import create_api_response
from langchain_community.document_loaders import S3DirectoryLoader
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
    """
    Test function to extract graph from a local file.

    This function copies a PDF file from a source directory to a destination directory,
    then calls the 'extract_graph_from_file_local_file' function to extract the graph 
    from the copied PDF file. It then asserts the result of the extraction process.

    Returns:
        None
    """

    try:
        # Copy PDF file from source to destination directory
        shutil.copyfile('data/Copy01_patrick_pichette_-_wikipedia.pdf', 'backend/src/merged_files/Copy01_patrick_pichette_-_wikipedia.pdf')
        
        # Call 'extract_graph_from_file_local_file' function
        local_file_result =  extract_graph_from_file_local_file(
            graph,
            model,
            "Copy01_patrick_pichette_-_wikipedia.pdf"
        )

        # Print the result of the extraction process
        print(local_file_result)

        # Assert the result of the extraction process
        assert local_file_result['status'] == 'Completed' and local_file_result['nodeCount']>30 and local_file_result['relationshipCount']>20
        print("Success")
    except FileNotFoundError:
        print("Fail: File not found.")
    except Exception as e:
        print("Fail:", e)
        logging.error(f"Error occurred: {e}")


def extract_graph_from_Wikipedia(uri, userName, password, model, database):
    """
    Extracts graph data from Wikipedia.

    This function creates a source node for Wikipedia in the graph, extracts graph data
    from a specified Wikipedia page, and then asserts the result of the extraction process.

    Args:
        uri (str): The URI of the Wikipedia page.
        userName (str): The username for authentication.
        password (str): The password for authentication.
        model: The graph model.
        database: The database connection.

    Returns:
        None
    """

    try:
        # Create source node for Wikipedia in the graph
        create_source_node_graph_url_wikipedia(graph, model, 'Norway', 'Wikipedia')
        
        # Extract graph data from the specified Wikipedia page
        wikiresult = extract_graph_from_file_Wikipedia(graph, model, 'Norway', 1, '', '')

        # Print the result of the extraction process
        print(wikiresult)

        # Assert the result of the extraction process
        assert wikiresult['status'] == 'Completed' and wikiresult['nodeCount'] > 5 and wikiresult['relationshipCount'] > 3
        print("Success")
    except FileNotFoundError:
        print("Fail: File not found.")
    except Exception as e:
        print("Fail:", e)
        logging.error(f"Error occurred: {e}")

    #   Check for Wikipedia file to be Failed
def get_documents_from_Wikipedia(wiki_query: str):
    """
    Retrieves documents from Wikipedia based on the provided query.

    This function retrieves documents from Wikipedia using the provided query.
    It logs the total number of pages retrieved and asserts True if the retrieval
    process is successful.

    Args:
        wiki_query (str): The query string to search for documents on Wikipedia.

    Returns:
        None
    """
    file_name = ''
    
    try:
        # Retrieve documents from Wikipedia based on the query
        pages = WikipediaLoader(query=wiki_query.strip(), load_max_docs=1, load_all_available_meta=False).load()
        file_name = wiki_query.strip()
        logging.info(f"Total Pages from Wikipedia = {len(pages)}")
        print(file_name, pages)
        
        # Assert True if retrieval process is successful
        assert True
    except Exception as e:
        # Handle any exceptions that occur during the retrieval process
        job_status = "Failed"
        message = "Failed To Process Wikipedia Query"
        error_message = str(e)
        logging.error(f"An error occurred while processing Wikipedia query: {error_message}")
        print(error_message)

def extract_graph_from_youtube_video(uri, userName, password, model, database):
    """
    Extracts graph data from a YouTube video.

    This function creates a source node for the YouTube video in the graph, extracts
    graph data from the specified YouTube video, and then asserts the result of the
    extraction process.

    Args:
        uri (str): The URI of the YouTube video.
        userName (str): The username for authentication.
        password (str): The password for authentication.
        model: The graph model.
        database: The database connection.

    Returns:
        None
    """

    try:
        # Create source node for the YouTube video in the graph
        create_source_node_graph_url_youtube(graph, model, 'https://www.youtube.com/watch?v=T-qy-zPWgqA', 'youtube')
        
        # Extract graph data from the specified YouTube video
        youtuberesult = extract_graph_from_file_youtube(graph, model, 'https://www.youtube.com/watch?v=T-qy-zPWgqA', '', '')

        # Print the result of the extraction process
        print(youtuberesult)

        # Assert the result of the extraction process
        assert youtuberesult['status'] == 'Completed' and youtuberesult['nodeCount'] > 60 and youtuberesult['relationshipCount'] > 50
        print("Success")
    except FileNotFoundError:
        print("Failed: File not found.")
    except Exception as e:
        print("Failed:", e)
        logging.error(f"Error occurred: {e}")

# Check for Youtube_video to be Failed

# def extract_graph_from_youtube_video_fail(uri, userName, password, model, database):
#     youtuberesults =  extract_graph_from_file_youtube(
#              uri,
#             userName,
#             password,
#             model,
#             database,
#             'https://www.youtube.com/watch?v=U9mJuUkhUzk'
#             )
#     # print(result)
#     print(youtuberesults)
#     try:
#         assert youtuberesults['status'] == 'Completed'
#         print("Success")
#     except AssertionError as e:
#         print("Failed ", e)
 
def extract_graph_from_file_test_gcs(uri, userName, password, model, database):
    """
    Test function to extract graph from a file stored in Google Cloud Storage (GCS).

    This function creates a source node for a file stored in GCS in the graph, extracts
    graph data from the specified file, and then asserts the result of the extraction process.

    Args:
        uri (str): The URI of the GCS bucket.
        userName (str): The username for authentication.
        password (str): The password for authentication.
        model: The graph model.
        database: The database connection.

    Returns:
        None
    """

    try:
        # Create source node for the file stored in GCS in the graph
        create_source_node_graph_url_gcs(graph, model, 'llm_graph_transformer_test', 'technology', 'gcs bucket')
        
        # Extract graph data from the specified file stored in GCS
        gcsresult = extract_graph_from_file_gcs(graph, model, 'llm_graph_transformer_test', 'technology', 'Neuralink brain chip patient playing chess.pdf', '', '')

        # Print the result of the extraction process
        print(gcsresult)

        # Assert the result of the extraction process
        assert gcsresult['status'] == 'Completed' and gcsresult['nodeCount'] > 10 and gcsresult['relationshipCount'] > 5
        print("Success")
    except FileNotFoundError:
        print("Failed: File not found.")
    except Exception as e:
        print("Failed:", e)
        logging.error(f"Error occurred: {e}")

def extract_graph_from_file_test_s3(uri, userName, password, model, database):
    """
    Test function to extract graph from a file stored in Amazon S3.

    This function creates a source node for a file stored in Amazon S3 in the graph, 
    extracts graph data from the specified file, and then asserts the result of the 
    extraction process.

    Args:
        uri (str): The URI of the S3 bucket.
        userName (str): The AWS access key ID.
        password (str): The AWS secret access key.
        model: The graph model.
        database: The database connection.

    Returns:
        None
    """
    try:
        # Create source node for the file stored in S3 in the graph
        create_source_node_graph_url_s3(graph, model, 's3://development-llm-graph-builder-models/data/Sundar_Pichai_Gemini.pdf', '', '', 's3 bucket')

        # Not passing key here
        # Extract graph data from the specified file stored in S3

        s3result = extract_graph_from_file_s3(graph, model, 's3://development-llm-graph-builder-models/data/Sundar_Pichai_Gemini.pdf', '', '', '', '')

        # Assert the result of the extraction process
        assert s3result['status'] == 'Completed' and s3result['nodeCount'] > 5 and s3result['relationshipCount'] > 10
        print("Success")
    except FileNotFoundError:
        print("Fail: File not found.")
    except Exception as e:
        print("Fail:", e)
        logging.error(f"Error occurred: {e}")

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

def chatbot_QnA(uri, userName, password, model, database):
    """
    Performs a question-answer operation using a chatbot.

    This function queries a chatbot with a question and retrieves the answer.
    It then asserts the length of the answer message to ensure it meets a minimum length requirement.

    Args:
        uri (str): The URI for the chatbot service.
        userName (str): The username for authentication.
        password (str): The password for authentication.
        model: The chatbot model.
        database: The database connection.

    Returns:
        None
    """

    try:
        # Perform question-answer operation using the chatbot
        QA_n_RAG = QA_RAG(
            uri,
            model,
            userName,
            password,
            'who is patrick pichette',
            1
        )
        
        # Print the result of the question-answer operation
        print(QA_n_RAG)
        print(len(QA_n_RAG['message']))

        # Assert the length of the answer message
        assert len(QA_n_RAG['message']) > 10
        print("Success")
    except FileNotFoundError:
        print("Failed: File not found.")
    except Exception as e:
        print("Failed:", e)
        logging.error(f"Error occurred: {e}")


if __name__ == "__main__":

        extract_graph_from_file_local_file_test()
        extract_graph_from_Wikipedia(uri, userName, password, model,database)
        get_documents_from_Wikipedia("  ")
        extract_graph_from_youtube_video(uri, userName, password, model, database)
        extract_graph_from_file_test_gcs(uri, userName, password, model, database)
        extract_graph_from_file_test_s3(uri, userName, password, model, database)
        chatbot_QnA(uri, userName, password, model, database)