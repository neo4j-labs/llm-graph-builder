import os
import logging
import time
from src.llm import get_llm
from datasets import Dataset
from dotenv import load_dotenv
from ragas import evaluate
from ragas.metrics import answer_relevancy, faithfulness
from src.shared.common_fn import load_embedding_model 
from ragas.dataset_schema import SingleTurnSample
from ragas.metrics import BleuScore, RougeScore, SemanticSimilarity, ContextEntityRecall
from ragas.metrics._factual_correctness import FactualCorrectness
from ragas.llms import LangchainLLMWrapper
from langchain_openai import ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from ragas.embeddings import LangchainEmbeddingsWrapper
import nltk

nltk.download('punkt')
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


async def get_additional_metrics(question: str, contexts: list, answers: list, reference: str, model_name: str):
   """Calculates multiple metrics for given question, answers, contexts, and reference."""
   try:
       if ("diffbot" in model_name) or ("ollama" in model_name):
           raise ValueError(f"Unsupported model for evaluation: {model_name}")
       llm, model_name = get_llm(model=model_name)
       ragas_llm = LangchainLLMWrapper(llm)
       embeddings = EMBEDDING_FUNCTION
       embedding_model = LangchainEmbeddingsWrapper(embeddings=embeddings)
       rouge_scorer = RougeScore()
       factual_scorer = FactualCorrectness()
       semantic_scorer = SemanticSimilarity()
       entity_recall_scorer = ContextEntityRecall()
       factual_scorer.llm = ragas_llm
       entity_recall_scorer.llm = ragas_llm
       semantic_scorer.embeddings = embedding_model
       metrics = []
       for response, context in zip(answers, contexts):
           sample = SingleTurnSample(response=response, reference=reference)
           rouge_score = await rouge_scorer.single_turn_ascore(sample)
           rouge_score = round(rouge_score,4)
           semantic_score = await semantic_scorer.single_turn_ascore(sample)
           semantic_score = round(semantic_score, 4)
           if "gemini" in model_name:
               entity_recall_score = "Not Available"
           else:
            #    fact_score = await factual_scorer.single_turn_ascore(sample)
            #    fact_score = round(fact_score, 4)
               entity_sample = SingleTurnSample(reference=reference, retrieved_contexts=[context])
               entity_recall_score = await entity_recall_scorer.single_turn_ascore(entity_sample)
               entity_recall_score = round(entity_recall_score, 4)
           metrics.append({
               "rouge_score": rouge_score,
               "semantic_score": semantic_score,
               "context_entity_recall_score": entity_recall_score
           })
       return metrics
   except Exception as e:
       logging.exception("Error in get_additional_metrics")
       return {"error": str(e)}