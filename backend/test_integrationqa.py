import os
import shutil
import logging
import pandas as pd
from datetime import datetime as dt
from dotenv import load_dotenv

from score import *
from src.main import *
from src.QA_integration_new import QA_RAG
from langserve import add_routes

# Load environment variables if needed
load_dotenv()

# Constants
URI = ''
USERNAME = ''
PASSWORD = ''
DATABASE = 'neo4j'
CHUNK_DIR = os.path.join(os.path.dirname(__file__), "chunks")
MERGED_DIR = os.path.join(os.path.dirname(__file__), "merged_files")

# Initialize database connection
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
    """Test graph creation from a local file."""
    file_name = 'About Amazon.pdf'
    shutil.copyfile('/workspaces/llm-graph-builder/backend/files/About Amazon.pdf',
                    os.path.join(MERGED_DIR, file_name))

    create_source_node_local(graph, model_name, file_name)
    merged_file_path = os.path.join(MERGED_DIR, file_name)

    local_file_result = extract_graph_from_file_local_file(
        URI, USERNAME, PASSWORD, DATABASE, model_name, merged_file_path, file_name, '', ''
    )
    logging.info("Local file processing complete")
    print(local_file_result)

    try:
        assert local_file_result['status'] == 'Completed'
        assert local_file_result['nodeCount'] > 0
        assert local_file_result['relationshipCount'] > 0
        print("Success")
    except AssertionError as e:
        print("Fail: ", e)

    return local_file_result

def test_graph_from_wikipedia(model_name):
    """Test graph creation from a Wikipedia page."""
    wiki_query = 'https://en.wikipedia.org/wiki/Ram_Mandir'
    source_type = 'Wikipedia'
    file_name = "Ram_Mandir"
    create_source_node_graph_url_wikipedia(graph, model_name, wiki_query, source_type)

    wiki_result = extract_graph_from_file_Wikipedia(
        URI, USERNAME, PASSWORD, DATABASE, model_name, file_name, 1, 'en', '', ''
    )
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

def test_chatbot_qna(model_name, mode='graph+vector'):
    """Test chatbot QnA functionality for different modes."""
    QA_n_RAG = QA_RAG(graph, model_name, 'Tell me about amazon', '[]', 1, mode)
    print(QA_n_RAG)
    print(len(QA_n_RAG['message']))

    try:
        assert len(QA_n_RAG['message']) > 20
        print("Success")
    except AssertionError as e:
        print("Failed: ", e)

    return QA_n_RAG

def compare_graph_results(results):
    """
    Compare graph results across different models.
    Add custom logic here to compare graph data, nodes, and relationships.
    """
    # Placeholder logic for comparison
    print("Comparing results...")
    for i in range(len(results) - 1):
        result_a = results[i]
        result_b = results[i + 1]
        if result_a == result_b:
            print(f"Result {i} is identical to result {i+1}")
        else:
            print(f"Result {i} differs from result {i+1}")

def run_tests():
    final_list = []
    error_list = []
    models = [
        'openai-gpt-3.5', 'openai-gpt-4o', 'openai-gpt-4o-mini', 'azure_ai_gpt_35',
        'azure_ai_gpt_4o', 'anthropic_claude_3_5_sonnet', 'fireworks_v3p1_405b',
        'fireworks_llama_v3_70b', 'ollama_llama3', 'bedrock_claude_3_5_sonnet'
    ]

    for model_name in models:
        try:
            final_list.append(test_graph_from_file_local(model_name))
            final_list.append(test_graph_from_wikipedia(model_name))
            final_list.append(test_graph_from_youtube_video(model_name))
            final_list.append(test_chatbot_qna(model_name))
            final_list.append(test_chatbot_qna(model_name, mode='vector'))
            final_list.append(test_chatbot_qna(model_name, mode='hybrid'))
        except Exception as e:
            error_list.append((model_name, str(e)))
    #Compare and log diffrences in graph results
    compare_graph_results(final_list)  # Pass the final_list to comapre_graph_results

    # Save final results to CSV
    df = pd.DataFrame(final_list)
    df['execution_date'] = dt.today().strftime('%Y-%m-%d')
    df.to_csv(f"Integration_TestResult_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

    # Save error details to CSV
    df_errors = pd.DataFrame(error_list, columns=['Model', 'Error'])
    df_errors['execution_date'] = dt.today().strftime('%Y-%m-%d')
    df_errors.to_csv(f"Error_details_{dt.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)

if __name__ == "__main__":
    run_tests()