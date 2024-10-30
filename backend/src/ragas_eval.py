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


async def get_additional_metrics(question: str,contexts: list, answers: list,  reference: str, model_name):
   """Calculates multiple metrics for given question, answers, contexts, and reference."""
   if ("diffbot" in model_name) or ("ollama" in model_name):
       raise ValueError(f"Unsupported model for evaluation: {model_name}")
   else:
       llm, model_name = get_llm(model=model_name)
   ragas_llm = LangchainLLMWrapper(llm)   
   embeddings = EMBEDDING_FUNCTION
   embedding_model = LangchainEmbeddingsWrapper(embeddings=embeddings)
   #bleu_scorer = BleuScore()
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
       #bleu_score = await bleu_scorer.single_turn_ascore(sample)
       rouge_score = await rouge_scorer.single_turn_ascore(sample)
       fact_score = await factual_scorer.single_turn_ascore(sample)
       semantic_score = await semantic_scorer.single_turn_ascore(sample)
       entity_sample = SingleTurnSample(reference=reference, retrieved_contexts=[context])
       entity_recall_score = await entity_recall_scorer.single_turn_ascore(entity_sample)
       metrics.append({
           #"bleu_score": bleu_score,
           "rouge_score": rouge_score,
           "fact_score": fact_score,
           "semantic_score": semantic_score,
           "context_entity_recall_score": entity_recall_score
       })
   print("Metrics  :",metrics) 
   return metrics  