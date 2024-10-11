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

RAGAS_MODEL_VERSIONS = {
    "openai_gpt_3.5": "gpt-3.5-turbo-16k",
    "openai_gpt_4": "gpt-4-turbo-2024-04-09",
    "openai_gpt_4o_mini": "gpt-4o-mini-2024-07-18",
    "openai_gpt_4o": "gpt-4o-mini-2024-07-18",
    "groq_llama3_70b": "groq_llama3_70b",
}
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
EMBEDDING_FUNCTION, _ = load_embedding_model(EMBEDDING_MODEL)


def get_ragas_llm(model: str) -> Tuple[object, str]:
    """Retrieves the specified language model.  Improved error handling and structure."""
    env_key = f"LLM_MODEL_CONFIG_{model}"
    env_value = os.environ.get(env_key)
    logging.info(f"Loading model configuration: {env_key}")
    try:
        if "openai" in model:
            model_name = RAGAS_MODEL_VERSIONS[model]
            llm = ChatOpenAI(
                api_key=os.environ.get("OPENAI_API_KEY"), model=model_name, temperature=0
            )
        elif "groq" in model:
            model_name, base_url, api_key = env_value.split(",")
            llm = ChatGroq(api_key=api_key, model_name=model_name, temperature=0)
        else:
            raise ValueError(f"Unsupported model for evaluation: {model}")

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
    except ValueError as e:
       if "Unsupported model for evaluation" in str(e):
           logging.error(f"Unsupported model error: {e}")
           return {"error": str(e)}  # Return the specific error message as a dictionary
       logging.exception(f"ValueError during metrics evaluation: {e}")
       return {"error": str(e)}
    except Exception as e:
       logging.exception(f"Error during metrics evaluation: {e}")
       return {"error": str(e)}
