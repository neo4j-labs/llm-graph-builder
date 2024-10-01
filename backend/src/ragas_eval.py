from ragas.metrics import (
    answer_relevancy,
    faithfulness,
    context_utilization 
    
)
from datasets import Dataset 
from ragas import evaluate

import os
import logging
from dotenv import load_dotenv
load_dotenv()


def get_ragas_metrics(question, contexts, answer):
    try:
        data_samples = {
            'question': [question],
            'answer': [answer],
            'contexts': [[contexts]],
        }
        
        dataset = Dataset.from_dict(data_samples)
        logging.info("Dataset created successfully.")

        score = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_utilization])
        logging.info("Evaluation completed successfully.")
        
        return score
    
    except Exception as e:
        logging.error(f"An error occurred during metrics evaluation: {e}")
        return None