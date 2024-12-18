import os
import logging
import time
from src.llm import get_llm
from datasets import Dataset
from dotenv import load_dotenv
from ragas import evaluate
from ragas.metrics import answer_relevancy, faithfulness,context_entity_recall
from src.shared.common_fn import load_embedding_model 
from ragas.dataset_schema import SingleTurnSample
from ragas.metrics import RougeScore, SemanticSimilarity, ContextEntityRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
import nltk

nltk.download('punkt')
load_dotenv()

EMBEDDING_MODEL = os.getenv("RAGAS_EMBEDDING_MODEL")
logging.info(f"Loading embedding model '{EMBEDDING_MODEL}' for ragas evaluation")
EMBEDDING_FUNCTION, _ = load_embedding_model(EMBEDDING_MODEL)

def get_ragas_metrics(question: str, context: list, answer: list, model: str):
    """Calculates RAGAS metrics."""
    try:
        start_time = time.time()
        dataset = Dataset.from_dict(
            {"question": [question] * len(answer),"reference": answer, "answer": answer, "contexts": [[ctx] for ctx in context]}
        )
        logging.info("Evaluation dataset created successfully.")
        if ("diffbot" in model) or ("ollama" in model):
            raise ValueError(f"Unsupported model for evaluation: {model}")
        elif ("gemini" in model):
            llm, model_name = get_llm(model=model)
            llm = LangchainLLMWrapper(llm,is_finished_parser=custom_is_finished_parser)
        else:
            llm, model_name = get_llm(model=model)
            llm = LangchainLLMWrapper(llm)
    
        logging.info(f"Evaluating with model: {model_name}")

        score = evaluate(
            dataset=dataset,
            metrics=[faithfulness, answer_relevancy,context_entity_recall],
            llm=llm,
            embeddings=EMBEDDING_FUNCTION,
        )
        
        score_dict = (
            score.to_pandas()[["faithfulness", "answer_relevancy","context_entity_recall"]]
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
       embeddings = EMBEDDING_FUNCTION
       embedding_model = LangchainEmbeddingsWrapper(embeddings=embeddings)
       rouge_scorer = RougeScore()
       semantic_scorer = SemanticSimilarity()
       semantic_scorer.embeddings = embedding_model
       metrics = []
       for response, context in zip(answers, contexts):
           sample = SingleTurnSample(response=response, reference=reference)
           rouge_score = await rouge_scorer.single_turn_ascore(sample)
           rouge_score = round(rouge_score,4)
           semantic_score = await semantic_scorer.single_turn_ascore(sample)
           semantic_score = round(semantic_score, 4)
           metrics.append({
               "rouge_score": rouge_score,
               "semantic_score": semantic_score,
           })
       return metrics
   except Exception as e:
       logging.exception("Error in get_additional_metrics")
       return {"error": str(e)}
   

def custom_is_finished_parser(response):
    is_finished_list = []
    for g in response.flatten():
        resp = g.generations[0][0]
        if resp.generation_info is not None:
            if resp.generation_info.get("finish_reason") is not None:
                is_finished_list.append(
                    resp.generation_info.get("finish_reason") == "STOP"
                )

        elif (
            isinstance(resp, ChatGeneration)
            and t.cast(ChatGeneration, resp).message is not None
        ):
            resp_message: BaseMessage = t.cast(ChatGeneration, resp).message
            if resp_message.response_metadata.get("finish_reason") is not None:
                is_finished_list.append(
                    resp_message.response_metadata.get("finish_reason") == "STOP"
                )
        else:
            is_finished_list.append(True)
    return all(is_finished_list)