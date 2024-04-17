# import main
# import score
# import uvicorn
from src.main import *
from fastapi import UploadFile, File
from tempfile import NamedTemporaryFile
import logging

uri =''
userName =''
password =''
model ='OpenAI GPT 3.5'
database =''
gcs_bucket_name = ''
gcs_bucket_folder = ''
gcs_blob_filename = ''


def create_upload_file(file_path: str) -> UploadFile:
    with open(file_path, "rb") as file:
        # Create a temporary file to store the contents
        temp_file = NamedTemporaryFile(delete=False)
        temp_file.write(file.read())
        
        # Close the original file and the temporary file
        file.close()
        temp_file.close()
        
        # Create the UploadFile object
        upload_file = UploadFile(temp_file.name)
        
        return upload_file
def extract_graph_from_file_local_file_test(uri, userName, password, model,database):
    local_file_result =  extract_graph_from_file_local_file(
           uri,
           userName,
           password,
           model,
           database,
           "data/Apple stock during pandemic.pdf"
    )
    print(local_file_result)
    logging.info("Info:  ")


#   Check for Wikipedia file to be success
def extract_graph_from_Wikipedia(uri, userName, password, model,database):
    # uploadFile = create_upload_file('/workspaces/llm-graph-builder/data/Football_news.pdf')
    result =  extract_graph_from_file_Wikipedia(
             uri,
            userName,
            password,
            model,
            database,
            'france',
            1)

   # print(result)
    
    logging.info("Info: Wikipedia test done")
    print(result)
    
    try:
        assert result['status'] == 'Completed'
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)
    

  
  #   Check for Wikipedia file to be Failed
def extract_graph_from_Wikipedia_fail(uri, userName, password, model,database):
    # uploadFile = create_upload_file('/workspaces/llm-graph-builder/data/Football_news.pdf')
    result =  extract_graph_from_file_Wikipedia(
             uri,
            userName,
            password,
            model,
            database,
            ' putin ',
            1)
   
    logging.info("Info: Wikipedia test done")
    print(result)
    #result = False
    try:
        assert result['status'] == 'Completed'
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)
    
    # assert result['status'] == 'Failed'

# Check for Youtube_video to be Success

def extract_graph_from_youtube_video(uri, userName, password, model, database):
    youtuberesult =  extract_graph_from_file_youtube(
             uri,
            userName,
            password,
            model,
            database,
            'https://www.youtube.com/watch?v=NKc8Tr5_L3w'
            )
    # print(result)
    print(youtuberesult)
    assert result['status'] == 'Completed'

# Check for Youtube_video to be Failed

def extract_graph_from_youtube_video_fail(uri, userName, password, model, database):
    youtuberesult =  extract_graph_from_file_youtube(
             uri,
            userName,
            password,
            model,
            database,
            'https://www.youtube.com/watch?v=U9mJuUkhUzk'
            )
    # print(result)
    print(youtuberesult)
    assert youtuberesult['status'] == 'Failed'

# Check for the GCS file to be uploaded, process and completed

def extract_graph_from_file_test_gcs(uri, userName, password, model, database):
    gcsresult =  extract_graph_from_file_gcs(
             uri,
            userName,
            password,
            model,
            database,
            'llm_graph_transformer_test',
            'technology',
            'Neuralink brain chip patient playing chess.pdf'
            )

    # print(result)
    logging.info("Info")
    print(gcsresult)
    
    try:
        assert gcsresult['status'] == 'Completed'
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)

    # print(gcsresult)
    # assert gcsresult['status'] == 'Completed'

if __name__ == "__main__":

    #extract_graph_from_Wikipedia(uri, userName, password, model,database)
    #extract_graph_from_Wikipedia_fail(uri, userName, password, model,database)
    # #extract_graph_from_youtube_video(uri, userName, password, model, database)
    # #extract_graph_from_youtube_video_fail(uri, userName, password, model, database)
    #extract_graph_from_file_test_gcs(uri, userName, password, model, database)
    extract_graph_from_file_local_file_test(uri, userName, password, model,database)