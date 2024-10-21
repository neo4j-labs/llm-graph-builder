import os
import logging
import time
from src.llm import get_llm
from datasets import Dataset
from dotenv import load_dotenv
from ragas import evaluate
from ragas.metrics import answer_relevancy, faithfulness
from src.shared.common_fn import load_embedding_model 
load_dotenv()

EMBEDDING_MODEL = os.getenv("RAGAS_EMBEDDING_MODEL")
EMBEDDING_FUNCTION, _ = load_embedding_model(EMBEDDING_MODEL)

def get_ragas_metrics(question: str, context: list, answer: list, model: str):
    """Calculates RAGAS metrics."""
    try:
        start_time = time.time()
        dataset = Dataset.from_dict(
            {"question": [question] * len(answer), "answer": answer, "contexts": [[ctx] for ctx in context]}
        )
        logging.info("Evaluation dataset created successfully.")
        if ("diffbot" in model) or ("ollama" in model):
            raise ValueError(f"Unsupported model for evaluation: {model}")
        else:
            llm, model_name = get_llm(model=model)
    
        logging.info(f"Evaluating with model: {model_name}")

        score = evaluate(
            dataset=dataset,
            metrics=[faithfulness, answer_relevancy],
            llm=llm,
            embeddings=EMBEDDING_FUNCTION,
        )
        
        score_dict = (
            score.to_pandas()[["faithfulness", "answer_relevancy"]]
            .fillna(0)
            .round(4)
            .to_dict(orient="list")
        ) 
        end_time = time.time()
        logging.info(f"Evaluation completed in: {end_time - start_time:.2f} seconds")
        return score_dict
    except ValueError as e:
       if "Unsupported model for evaluation" in str(e):
           logging.error(f"Unsupported model error: {e}")
           return {"error": str(e)} 
       logging.exception(f"ValueError during metrics evaluation: {e}")
       return {"error": str(e)}
    except Exception as e:
       logging.exception(f"Error during metrics evaluation: {e}")
       return {"error": str(e)}
