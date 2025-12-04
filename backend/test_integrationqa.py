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
from pathlib import Path
from typing import Any, Dict, List, Tuple
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from typing import Callable, List, Dict, Any, Tuple
import pandas as pd

# Load environment variables
load_dotenv()
URI = os.getenv('NEO4J_URI')
USERNAME = os.getenv('NEO4J_USERNAME')
PASSWORD = os.getenv('NEO4J_PASSWORD')
DATABASE = os.getenv('NEO4J_DATABASE')
# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
# Directory Paths
BASE_DIR = Path(__file__).parent
CHUNK_DIR = BASE_DIR / "chunks"
MERGED_DIR = BASE_DIR / "merged_files"
RESULTS_DIR = BASE_DIR / "test_results"
RESULTS_DIR.mkdir(exist_ok=True)

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

def save_result_csv(data: Dict[str, Any], filename: str):
    file_path = RESULTS_DIR / filename
    df = pd.DataFrame([data])
    if not file_path.exists():
        df.to_csv(file_path, index=False)
    else:
        df.to_csv(file_path, mode='a', header=False, index=False)

def save_result_json(data: Any, filename: str):
    file_path = RESULTS_DIR / filename
    tmp_path = file_path.with_suffix('.tmp')
    with open(tmp_path, "w") as f:
        json.dump(data, f, indent=4)
    tmp_path.rename(file_path)

def test_graph_from_file_local(model_name):
   """Tests graph creation from a local file."""
   try:
       file_name = 'About Amazon.pdf'
       merged_file_path = MERGED_DIR / file_name
       shutil.copyfile('/workspaces/llm-graph-builder/backend/files/About Amazon.pdf', merged_file_path)
       graph = create_graph_database_connection(URI, USERNAME, PASSWORD, DATABASE)
       create_source_node_local(graph, model_name, file_name)
       result = asyncio.run(
           extract_graph_from_file_local_file(
               URI, USERNAME, PASSWORD, DATABASE, model_name, str(merged_file_path), file_name, '', '',100,20,1, None,''
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
               URI, USERNAME, PASSWORD, DATABASE, model_name, file_name, 'en', file_name, '', '', 100,20,1,None,''
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
               URI, USERNAME, PASSWORD, DATABASE, model_name, source_url, file_name, '', '',100,20,1, None,''
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
               URI, USERNAME, PASSWORD, DATABASE, model_name, source_url, "Google Cloud Skills Boost-www", '', '',100,20,1, None,''
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
       logging.info(f"Chatbot QnA test passed for mode: {mode}")
       final_result = {'model_name':model_name,'mode':mode,'result':result}
       return final_result
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
       result_schema = populate_graph_schema_from_text(schema_text, model_name, True, False)
       logging.info(f"Schema test result: {result_schema}")
       return result_schema
   except Exception as e:
       logging.error(f"Error in populate_graph_schema_from_text: {e}")
       return {"status": "Failed", "error": str(e)}
   
def get_duplicate_nodes():
       graphDb_data_Access = graphDBdataAccess(graph)
       nodes_list, total_nodes = graphDb_data_Access.get_duplicate_nodes_list()
       if total_nodes['total']>0:
           return "Data successfully loaded"
       else:
           return "Unable to load data"

def flatten_extract_dataframe(df: pd.DataFrame):
   rows = []
   for _, row in df.iterrows():
       try:
           col1, col2, execution_date = row[0], row[1], row[2] if len(row) > 2 else None
           data_dict = ast.literal_eval(col1) if isinstance(col1, str) and col1.startswith("{") else {}
           meta_dict = ast.literal_eval(col2) if isinstance(col2, str) and col2.startswith("{") else {}
           combined_dict = {**data_dict, **meta_dict}
           for key in combined_dict.keys():
               if isinstance(combined_dict[key], dict) and key.startswith("processed_chunk_detail"):
                   combined_dict[key] = str(combined_dict[key])
           combined_dict["execution_date"] = execution_date
           rows.append(combined_dict)
       except (SyntaxError, ValueError, TypeError) as e:
           print(f"Error parsing row: {row} - {e}")
           continue
   flat_df = pd.DataFrame(rows)
   return flat_df

def run_model_tests(model_name: str, chatbot_modes: List[str]) -> Dict[str, Any]:
    """
    Runs all test functions for a single model, saving results incrementally.
    Returns a summary dict for reporting.
    """
    test_funcs: List[Tuple[Callable, List[Any], str]] = [
        (test_graph_from_file_local, [model_name], f"Extract_Integration_TestResult_{model_name}.csv"),
        (test_graph_from_wikipedia, [model_name], f"Extract_Integration_TestResult_{model_name}.csv"),
        (test_graph_from_youtube_video, [model_name], f"Extract_Integration_TestResult_{model_name}.csv"),
        (test_graph_website, [model_name], f"Extract_Integration_TestResult_{model_name}.csv"),
    ]
    extract_error_list = []
    chatbot_error_list = []
    other_api_list = []
    test_results = []
    with tqdm(total=len(test_funcs), desc=f"Model: {model_name}", position=1, leave=False) as test_bar:
        for test_func, test_args, result_file in test_funcs:
            start_time = time.time()
            try:
                result = test_func(*test_args)
                elapsed = time.time() - start_time
                logging.info(f"{test_func.__name__} for {model_name} completed in {elapsed:.2f} seconds.")
                result_with_time = result.copy() if isinstance(result, dict) else {"result": result}
                result_with_time["time_taken_sec"] = round(elapsed, 2)
                result_with_time["test_function"] = test_func.__name__
                save_result_csv(result_with_time, result_file)
                test_results.append(result_with_time)
                if isinstance(result, dict) and result.get("status") == "Failed":
                    extract_error_list.append((model_name, test_func.__name__, result.get("error", "Unknown error"), round(elapsed, 2)))
            except Exception as e:
                elapsed = time.time() - start_time
                logging.error(f"Error in {test_func.__name__} for {model_name}: {e} (Time taken: {elapsed:.2f}s)")
                extract_error_list.append((model_name, test_func.__name__, str(e), round(elapsed, 2)))
                save_result_csv({"model": model_name, "function": test_func.__name__, "error": str(e), "time_taken_sec": round(elapsed, 2)}, result_file)
            test_bar.update(1)
        # Chatbot tests
        with tqdm(total=len(chatbot_modes), desc=f"Chatbot: {model_name}", position=2, leave=False) as chatbot_bar:
            for mode in chatbot_modes:
                start_time = time.time()
                try:
                    result = test_chatbot_qna(model_name, mode=mode)
                    elapsed = time.time() - start_time
                    logging.info(f"test_chatbot_qna ({mode}) for {model_name} completed in {elapsed:.2f} seconds.")
                    result_with_time = result.copy() if isinstance(result, dict) else {"result": result}
                    result_with_time["time_taken_sec"] = round(elapsed, 2)
                    result_with_time["mode"] = mode
                    save_result_csv(result_with_time, f"chatbot_Integration_TestResult_{model_name}.csv")
                    test_results.append(result_with_time)
                    if isinstance(result, dict) and result.get("status") == "Failed":
                        chatbot_error_list.append((model_name, f"test_chatbot_qna ({mode})", result.get("error", "Unknown error"), round(elapsed, 2)))
                except Exception as e:
                    elapsed = time.time() - start_time
                    logging.error(f"Error in test_chatbot_qna ({mode}) for {model_name}: {e} (Time taken: {elapsed:.2f}s)")
                    chatbot_error_list.append((model_name, f"test_chatbot_qna ({mode})", str(e), round(elapsed, 2)))
                    save_result_csv({"model": model_name, "function": "test_chatbot_qna", "mode": mode, "error": str(e), "time_taken_sec": round(elapsed, 2)}, f"chatbot_Integration_TestResult_{model_name}.csv")
                chatbot_bar.update(1)
        # Schema test
        start_time = time.time()
        try:
            schema_result = test_populate_graph_schema_from_text(model_name)
            elapsed = time.time() - start_time
            logging.info(f"test_populate_graph_schema_from_text for {model_name} completed in {elapsed:.2f} seconds.")
            schema_result_with_time = schema_result.copy() if isinstance(schema_result, dict) else {"result": schema_result}
            schema_result_with_time["time_taken_sec"] = round(elapsed, 2)
            save_result_json(schema_result_with_time, f"schema_result_{model_name}.json")
            other_api_list.append({f"{model_name}": schema_result_with_time})
        except Exception as e:
            elapsed = time.time() - start_time
            logging.error(f"Error in test_populate_graph_schema_from_text for {model_name}: {e} (Time taken: {elapsed:.2f}s)")
            other_api_list.append({f"{model_name}": str(e)})
            save_result_json({"model": model_name, "error": str(e), "time_taken_sec": round(elapsed, 2)}, f"schema_result_{model_name}.json")
    return {
        "model": model_name,
        "extract_errors": extract_error_list,
        "chatbot_errors": chatbot_error_list,
        "other_api": other_api_list,
        "test_results": test_results
    }

def run_tests_parallel(models: List[str], chatbot_modes: List[str]) -> None:
    """
    Runs all model tests in parallel, shows progress bars, and generates a summary report.
    """
    all_summaries = []
    with tqdm(total=len(models), desc="Models", position=0) as model_bar:
        with ThreadPoolExecutor(max_workers=min(4, len(models))) as executor:
            futures = {executor.submit(run_model_tests, model, chatbot_modes): model for model in models}
            for future in as_completed(futures):
                summary = future.result()
                all_summaries.append(summary)
                model_bar.update(1)
    # Handle disconnected nodes and duplicates (single-threaded, after all models)
    start_time = time.time()
    try:
        dis_elementid, dis_status = get_disconnected_nodes()
        delete_status = delete_disconnected_nodes([dis_elementid]) if dis_elementid else "No disconnected nodes found"
        elapsed = time.time() - start_time
        save_result_json({"disconnected_nodes": dis_status, "delete_status": delete_status, "time_taken_sec": round(elapsed, 2)}, "disconnected_nodes.json")
    except Exception as e:
        elapsed = time.time() - start_time
        save_result_json({"error": str(e), "time_taken_sec": round(elapsed, 2)}, "disconnected_nodes.json")
    start_time = time.time()
    try:
        dup = get_duplicate_nodes()
        elapsed = time.time() - start_time
        save_result_json({"duplicate_nodes": dup, "time_taken_sec": round(elapsed, 2)}, "duplicate_nodes.json")
    except Exception as e:
        elapsed = time.time() - start_time
        save_result_json({"error": str(e), "time_taken_sec": round(elapsed, 2)}, "duplicate_nodes.json")
    # Save errors incrementally
    for summary in all_summaries:
        if summary["extract_errors"]:
            df_errors = pd.DataFrame(summary["extract_errors"], columns=['Model', 'Function', 'Error', 'TimeTakenSec'])
            df_errors['execution_date'] = dt.today().strftime('%Y-%m-%d')
            df_errors.to_csv(RESULTS_DIR / f"Extract_Error_details.csv", mode='a', header=not (RESULTS_DIR / f"Extract_Error_details.csv").exists(), index=False)
        if summary["chatbot_errors"]:
            df_errors = pd.DataFrame(summary["chatbot_errors"], columns=['Model', 'Function', 'Error', 'TimeTakenSec'])
            df_errors['execution_date'] = dt.today().strftime('%Y-%m-%d')
            df_errors.to_csv(RESULTS_DIR / f"chatbot_Error_details.csv", mode='a', header=not (RESULTS_DIR / f"chatbot_Error_details.csv").exists(), index=False)
    # Generate summary report
    generate_summary_report(all_summaries, RESULTS_DIR / "summary_report.md")
    logging.info("All tests completed.")

def generate_summary_report(summaries: List[Dict[str, Any]], report_path: Path) -> None:
    """
    Generates a Markdown summary report from all model test summaries.
    """
    lines = ["# Integration Test Summary Report\n"]
    for summary in summaries:
        lines.append(f"## Model: {summary['model']}\n")
        lines.append("### Test Results\n")
        for result in summary["test_results"]:
            status = result.get("status", "Success")
            func = result.get("test_function", result.get("mode", ""))
            time_taken = result.get("time_taken_sec", "")
            lines.append(f"- **{func}**: {status} (Time: {time_taken}s)")
        if summary["extract_errors"]:
            lines.append("\n### Extract Errors\n")
            for err in summary["extract_errors"]:
                lines.append(f"- {err}")
        if summary["chatbot_errors"]:
            lines.append("\n### Chatbot Errors\n")
            for err in summary["chatbot_errors"]:
                lines.append(f"- {err}")
        lines.append("\n---\n")
    with open(report_path, "w") as f:
        f.write("\n".join(lines))

# Usage in main
if __name__ == "__main__":
    models = [
            'openai_gpt_5.1',
            'openai_gpt_5_mini',
            'openai_gpt_4.1',
            'openai_gpt_4.1_mini',
            'gemini_2.5_flash',
            'gemini_2.5_pro',
            'groq_llama3.1_8b',
            'anthropic_claude_4.5_sonnet',
            'llama4_maverick',
            'fireworks_gpt_oss',
            'fireworks_deepseek_v3',
            'bedrock_nova_micro_v1',
            'bedrock_nova_lite_v1',
            'bedrock_nova_pro_v1'
            ]
    chatbot_modes = [
        "vector",
        "graph+vector",
        "fulltext",
        "graph+vector+fulltext",
        "entity search+vector"
    ]
    run_tests_parallel(models, chatbot_modes)
