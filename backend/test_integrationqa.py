from score import *
from src.main import *
import logging
from src.QA_integration_new import QA_RAG
from langserve import add_routes
import asyncio
import os


uri =''
userName =''
password =''
model ='OpenAI GPT 3.5'
database =''
CHUNK_DIR = os.path.join(os.path.dirname(__file__), "chunks")
MERGED_DIR = os.path.join(os.path.dirname(__file__), "merged_files")
graph = create_graph_database_connection(uri, userName, password, database)

def test_graph_from_file_local_file():
    file_name = 'About Amazon.pdf'
    #shutil.copyfile('data/Bank of America Q23.pdf', 'backend/src/merged_files/Bank of America Q23.pdf')
    shutil.copyfile('/workspaces/llm-graph-builder/data/About Amazon.pdf', '/workspaces/llm-graph-builder/backend/merged_files/About Amazon.pdf')
    obj_source_node = sourceNode()
    obj_source_node.file_name = file_name
    obj_source_node.file_type = 'pdf'
    obj_source_node.file_size = '1087'
    obj_source_node.file_source = 'local file'
    obj_source_node.model = model
    obj_source_node.created_at = datetime.now()
    graphDb_data_Access = graphDBdataAccess(graph)
    graphDb_data_Access.create_source_node(obj_source_node)
    merged_file_path = os.path.join(MERGED_DIR,file_name)

    local_file_result =  extract_graph_from_file_local_file(graph, model, file_name,merged_file_path, '', '')

    print(local_file_result)
    
    logging.info("Info:  ")
    try:
        assert local_file_result['status'] == 'Completed' and local_file_result['nodeCount']>5 and local_file_result['relationshipCount']>10
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)

def test_graph_from_file_local_file_failed():
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

        local_file_result =  extract_graph_from_file_local_file(graph, model, file_name,merged_file_path, '', '')

        print(local_file_result)
    except AssertionError as e:
        print('Failed due to file does not exist means not uploaded or accidentaly deleteled from server')
        print("Failed: Error from extract function ", e)

#   Check for Wikipedia file to be success
def test_graph_from_Wikipedia():
    wiki_query = 'Norway'
    source_type = 'Wikipedia'
    create_source_node_graph_url_wikipedia(graph, model, wiki_query, source_type)
    wikiresult = extract_graph_from_file_Wikipedia(graph, model, wiki_query, 1, '', '')
    logging.info("Info: Wikipedia test done")
    print(wikiresult)
    try:
        assert wikiresult['status'] == 'Completed' and wikiresult['nodeCount']>10 and wikiresult['relationshipCount']>15
        print("Success")
    except AssertionError as e:
        print("Fail ", e)

def test_graph_from_Wikipedia_failed():
    wiki_query = 'Test QA 123456'
    source_type = 'Wikipedia'
    try:
        logging.info("Created source node for wikipedia")
        create_source_node_graph_url_wikipedia(graph, model, wiki_query, source_type)
    except AssertionError as e:
        print("Fail ", e)


# Check for Youtube_video to be Success
def test_graph_from_youtube_video():
    url = 'https://www.youtube.com/watch?v=T-qy-zPWgqA'
    source_type = 'youtube'

    create_source_node_graph_url_youtube(graph, model,url , source_type)
    youtuberesult = extract_graph_from_file_youtube(graph, model, url, '', '')

    logging.info("Info: Youtube Video test done")
    print(youtuberesult)
    try:
        assert youtuberesult['status'] == 'Completed' and youtuberesult['nodeCount']>60 and youtuberesult['relationshipCount']>40
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
    
# Check for Youtube_video to be Failed

def test_graph_from_youtube_video_failed():
    url = 'https://www.youtube.com/watch?v=U9mJuUkhUzk'
    source_type = 'youtube'

    create_source_node_graph_url_youtube(graph, model,url , source_type)
    youtuberesult = extract_graph_from_file_youtube(graph, model, url, ',', ',')
    # print(result)
    print(youtuberesult)
    try:
        assert youtuberesult['status'] == 'Completed'
        print("Success")
    except AssertionError as e:
        print("Failed ", e)
    
# Check for the GCS file to be uploaded, process and completed

def test_graph_from_file_test_gcs():

    bucket_name = 'llm_graph_transformer_test'
    folder_name = 'technology'
    source_type ='gcs bucket'
    file_name = 'Neuralink brain chip patient playing chess.pdf'
    create_source_node_graph_url_gcs(graph, model, bucket_name, folder_name, source_type)
    gcsresult = extract_graph_from_file_gcs(graph, model, bucket_name, folder_name, file_name, '', '')
    
    logging.info("Info")
    print(gcsresult)
    
    try:
        assert gcsresult['status'] == 'Completed' and gcsresult['nodeCount']>10 and gcsresult['relationshipCount']>5
        print("Success")
    except AssertionError as e:
        print("Failed ", e)

def test_graph_from_file_test_gcs_failed():

    bucket_name = 'llm_graph_transformer_neo'
    folder_name = 'technology'
    source_type ='gcs bucket'
    # file_name = 'Neuralink brain chip patient playing chess.pdf'
    try:
        create_source_node_graph_url_gcs(graph, model, bucket_name, folder_name, source_type)
        print("GCS: Create source node failed due to bucket not exist")
    except AssertionError as e:
        print("Failed ", e)

def test_graph_from_file_test_s3_failed():
    source_url = 's3://development-llm-graph-builder-models/'
    try:
        create_source_node_graph_url_s3(graph,model,source_url,'test123','pwd123')
        # assert result['status'] == 'Failed'
        # print("S3 created source node failed die to wrong access key id and secret")
    except AssertionError as e:
        print("Failed ", e)

# Check the Functionality of Chatbot QnA
def test_chatbot_QnA():
    QA_n_RAG = QA_RAG(graph, model,'who is patrick pichette',1 )
    
    print(QA_n_RAG)
    print(len(QA_n_RAG['message']))
    try:
        assert len(QA_n_RAG['message']) > 20
        print("Success")
    except AssertionError as e:
        print("Failed ", e)


if __name__ == "__main__":

            test_graph_from_file_local_file() # local file Success Test Case
            #test_graph_from_file_local_file_failed() # local file Failed Test Case

            test_graph_from_Wikipedia() # Wikipedia Success Test Case
            #test_graph_from_Wikipedia_failed() # Wikipedia Failed Test Case

            test_graph_from_youtube_video() # Youtube Success Test Case
            #test_graph_from_youtube_video_failed # Failed Test case

            test_graph_from_file_test_gcs() # GCS Success Test Case
            test_chatbot_QnA()

            #test_graph_from_file_test_s3_failed() # S3 Failed Test Case
            