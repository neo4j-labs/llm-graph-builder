import os
import logging
import time
from typing import Dict, Tuple, Optional
import boto3
from datasets import Dataset
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_aws import ChatBedrock
from langchain_community.chat_models import ChatOllama
from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
from langchain_fireworks import ChatFireworks
from langchain_google_vertexai import (
    ChatVertexAI,
    HarmBlockThreshold,
    HarmCategory,
)
from langchain_groq import ChatGroq
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from ragas import evaluate
from ragas.metrics import answer_relevancy, context_utilization, faithfulness
from src.shared.common_fn import load_embedding_model 

load_dotenv()

# Constants for clarity and maintainability
RAGAS_MODEL_VERSIONS = {
    "openai-gpt-3.5": "gpt-3.5-turbo-16k",
    "gemini-1.0-pro": "gemini-1.0-pro-001",
    "gemini-1.5-pro": "gemini-1.5-pro-002",
    "gemini-1.5-flash": "gemini-1.5-flash-002",
    "openai-gpt-4": "gpt-4-turbo-2024-04-09",
    "openai-gpt-4o-mini": "gpt-4o-mini-2024-07-18",
    "openai-gpt-4o": "gpt-4o-mini-2024-07-18",
    "diffbot": "gpt-4-turbo-2024-04-09",
    "groq-llama3": "groq_llama3_70b",
}

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
EMBEDDING_FUNCTION, _ = load_embedding_model(EMBEDDING_MODEL)


def get_ragas_llm(model: str) -> Tuple[object, str]:
    """Retrieves the specified language model.  Improved error handling and structure."""
    env_key = f"LLM_MODEL_CONFIG_{model}"
    env_value = os.environ.get(env_key)
    logging.info(f"Loading model configuration: {env_key}")
    try:
        if "gemini" in model:
            credentials, project_id = google.auth.default()
            model_name = RAGAS_MODEL_VERSIONS[model]
            llm = ChatVertexAI(
                model_name=model_name,
                credentials=credentials,
                project=project_id,
                temperature=0,
                safety_settings={
                    #setting safety to NONE for all categories.  Consider reviewing this for production systems
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
                api_key=os.environ.get("OPENAI_API_KEY"), model=model_name, temperature=0
            )
        
        elif "azure" in model:
             model_name, api_endpoint, api_key, api_version = env_value.split(",")
             llm = AzureChatOpenAI(
                 api_key=api_key,
                 azure_endpoint=api_endpoint,
                 azure_deployment=model_name,
                 api_version=api_version,
                 temperature=0,
             )
        elif "anthropic" in model:
            model_name, api_key = env_value.split(",")
            llm = ChatAnthropic(api_key=api_key, model=model_name, temperature=0)
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
            llm = DiffbotGraphTransformer(
                diffbot_api_key=os.environ.get("DIFFBOT_API_KEY"),
                extract_types=["entities", "facts"],
            )
        else:
            raise ValueError(f"Unsupported model: {model}")

        logging.info(f"Model loaded - Model Version: {model}")
        return llm, model_name
    except (ValueError, KeyError) as e:
        logging.error(f"Error loading LLM: {e}")
        raise


def get_ragas_metrics(
    question: str, context: str, answer: str, model: str
) -> Optional[Dict[str, float]]:
    """Calculates RAGAS metrics."""
    try:
        start_time = time.time()
        dataset = Dataset.from_dict(
            {"question": [question], "answer": [answer], "contexts": [[context]]}
        )
        logging.info("Dataset created successfully.")

        llm, model_name = get_ragas_llm(model=model)
        logging.info(f"Evaluating with model: {model_name}")
       
        score = evaluate(
            dataset=dataset,
            metrics=[faithfulness, answer_relevancy, context_utilization],
            llm=llm,
            embeddings=EMBEDDING_FUNCTION,
        )

        score_dict = (
            score.to_pandas()[["faithfulness", "answer_relevancy", "context_utilization"]]
            .round(4)
            .to_dict(orient="records")[0]
        ) 
        end_time = time.time()
        logging.info(f"Evaluation completed in: {end_time - start_time:.2f} seconds")
        return score_dict
    except Exception as e:
        logging.exception(f"Error during metrics evaluation: {e}") 
        return None