import os
# import sys
# sys.path.append(os.path.abspath('../backend'))
from ragas.metrics import (
    answer_relevancy,
    faithfulness,
    context_utilization
   
)
from datasets import Dataset
from ragas import evaluate
from src.shared.common_fn import load_embedding_model
import logging
import json
from dotenv import load_dotenv
load_dotenv()
 
from src.shared.common_fn import load_embedding_model
import os
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_google_vertexai import ChatVertexAI
from langchain_groq import ChatGroq
from langchain_google_vertexai import HarmBlockThreshold, HarmCategory
from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
from langchain_anthropic import ChatAnthropic
from langchain_fireworks import ChatFireworks
from langchain_aws import ChatBedrock
from langchain_community.chat_models import ChatOllama
import boto3
import google.auth

RAGAS_MODEL_VERSIONS = {
        "openai-gpt-3.5": "gpt-3.5-turbo-16k",
        "gemini-1.0-pro": "gemini-1.0-pro-001",
        "gemini-1.5-pro": "gemini-1.5-pro-002",
        "gemini-1.5-flash": "gemini-1.5-flash-002",
        "openai-gpt-4": "gpt-4-turbo-2024-04-09",
        "diffbot" : "gpt-4-turbo-2024-04-09",
        "openai-gpt-4o-mini": "gpt-4o-mini-2024-07-18",
        "groq-llama3" : "groq_llama3_70b"
         }
 

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL')
EMBEDDING_FUNCTION , _ = load_embedding_model(EMBEDDING_MODEL)


def get_ragas_llm(model: str):
    """Retrieve the specified language model based on the model name."""
    env_key = "LLM_MODEL_CONFIG_" + model
    env_value = os.environ.get(env_key)
    logging.info("Model: {}".format(env_key))
    if "gemini" in model:
        credentials, project_id = google.auth.default()
        model_name = RAGAS_MODEL_VERSIONS[model]
        llm = ChatVertexAI(
            model_name=model_name,
            #convert_system_message_to_human=True,
            credentials=credentials,
            project=project_id,
            temperature=0,
            safety_settings={
                HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            },
        )
    elif "openai" in model:
        model_name = RAGAS_MODEL_VERSIONS[model]
        llm = ChatOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
            model=model_name,
            temperature=0,
        )
 
    elif "azure" in model:
        model_name, api_endpoint, api_key, api_version = env_value.split(",")
        llm = AzureChatOpenAI(
            api_key=api_key,
            azure_endpoint=api_endpoint,
            azure_deployment=model_name,  # takes precedence over model parameter
            api_version=api_version,
            temperature=0,
            max_tokens=None,
            timeout=None,
        )
 
    elif "anthropic" in model:
        model_name, api_key = env_value.split(",")
        llm = ChatAnthropic(
            api_key=api_key, model=model_name, temperature=0, timeout=None
        )
 
    elif "fireworks" in model:
        model_name, api_key = env_value.split(",")
        llm = ChatFireworks(api_key=api_key, model=model_name)
 
    elif "groq" in model:
        model_name, base_url, api_key = env_value.split(",")
        llm = ChatGroq(api_key=api_key, model_name=model_name, temperature=0)
 
    elif "bedrock" in model:
        model_name, aws_access_key, aws_secret_key, region_name = env_value.split(",")
        bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=region_name,
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
        )
 
        llm = ChatBedrock(
            client=bedrock_client, model_id=model_name, model_kwargs=dict(temperature=0)
        )
 
    elif "ollama" in model:
        model_name, base_url = env_value.split(",")
        llm = ChatOllama(base_url=base_url, model=model_name)
 
    elif "diffbot" in model:
        model_name = "diffbot"
        llm = DiffbotGraphTransformer(
            diffbot_api_key=os.environ.get("DIFFBOT_API_KEY"),
            extract_types=["entities", "facts"],
        )
   
    else:
        model_name, api_endpoint, api_key = env_value.split(",")
        llm = ChatOpenAI(
            api_key=api_key,
            base_url=api_endpoint,
            model=model_name,
            temperature=0,
        )
           
    logging.info(f"Model created - Model Version: {model}")
    return llm, model_name

def  get_ragas_metrics(question,context,answer,model):
    try:
        #res = json.loads(metric_details)
        # dataset = {
        #     'question': [res["question"]],
        #     'answer': [res["answer"]],
        #     'contexts':[[res["contexts"]]],
        # }
        dataset = {
            'question': [question],
            'answer': [answer],
            'contexts':[[context]],
        }
        dataset = Dataset.from_dict(dataset)
        logging.info("Dataset created successfully.")

        llm, model_name = get_ragas_llm(model=model)

        embeddings = EMBEDDING_FUNCTION        

        score =  evaluate(dataset=dataset,metrics=[faithfulness, answer_relevancy, context_utilization],llm=llm,embeddings=embeddings)
        
        score_dict = score.to_pandas()[['faithfulness','answer_relevancy','context_utilization']].to_dict(orient="index")[0]
        logging.info("Evaluation completed successfully.")
        print("Type of score : ",type(score_dict))
        return score_dict
        
    except Exception as e:
        logging.error(f"An error occurred during metrics evaluation: {e}")
        return None