import os
import logging
import time
from src.llm import get_llm
from datasets import Dataset
from dotenv import load_dotenv
from ragas import evaluate
from src.shared.common_fn import load_embedding_model 
from ragas.dataset_schema import SingleTurnSample
from ragas.metrics import AnswerRelevancy, Faithfulness, RougeScore, SemanticSimilarity, ContextEntityRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
import nltk
from typing import List, Dict, Any
import typing as t
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatGeneration


nltk.data.path.append("/usr/local/nltk_data")
nltk.data.path.append(os.path.expanduser("~/.nltk_data"))
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    logging.debug("NLTK punkt tokenizer not found; downloading to ~/.nltk_data")
    nltk.download("punkt", download_dir=os.path.expanduser("~/.nltk_data"))

load_dotenv()

EMBEDDING_MODEL = os.getenv("RAGAS_EMBEDDING_MODEL")
if not EMBEDDING_MODEL:
    logging.error("RAGAS_EMBEDDING_MODEL is not configured")
    raise RuntimeError("RAGAS_EMBEDDING_MODEL is not configured")
logging.info("RAGAS embedding model configured for evaluation")
EMBEDDING_FUNCTION, _ = load_embedding_model(EMBEDDING_MODEL)

def get_ragas_metrics(
    question: str,
    context: list,
    answer: list,
    model: str,
) -> Dict[str, Any]:
    """Calculates RAGAS metrics."""
    try:
        start_time = time.time()
        answers = list(answer)
        contexts = list(context)
        min_len = min(len(answers), len(contexts))
        if min_len == 0:
            logging.warning("Empty answers or contexts; returning zeroed metrics")
            return {"faithfulness": [0.0], "answer_relevancy": [0.0], "context_entity_recall": [0.0]}

        if len(answers) != len(contexts):
            logging.warning(
                "Mismatched lengths for answers (%d) and contexts (%d); truncating to %d",
                len(answers), len(contexts), min_len,
            )
            answers = answers[:min_len]
            contexts = contexts[:min_len]
        questions = [question] * min_len

        dataset = Dataset.from_dict(
            {
                "question": questions,
                "reference": answers,
                "answer": answers,
                "contexts": [[ctx] for ctx in contexts],
            }
        )
        logging.info("Evaluation dataset created successfully with %d samples", min_len)
        if ("diffbot" in model) or ("ollama" in model):
            raise ValueError(f"Unsupported model for evaluation: {model}")
        elif "gemini" in model:
            llm, model_name = get_llm(model=model)
            llm = LangchainLLMWrapper(llm, is_finished_parser=custom_is_finished_parser)
        else:
            llm, model_name = get_llm(model=model)
            llm = LangchainLLMWrapper(llm)

        logging.info(f"Evaluating with model: {model_name}")

        score = evaluate(
            dataset=dataset,
            metrics=[Faithfulness(), AnswerRelevancy(), ContextEntityRecall()],
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
        logging.info(
            "RAGAS evaluation completed in %.2f seconds (model=%s, samples=%d)",
            end_time - start_time,
            model_name,
            len(answers),
        )
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


async def get_additional_metrics(
    question: str,
    contexts: list,
    answers: list,
    reference: str,
    model_name: str,
) -> Any:
   """Calculates multiple metrics for given question, answers, contexts, and reference."""
   try:
       if ("diffbot" in model_name) or ("ollama" in model_name):
           raise ValueError(f"Unsupported model for evaluation: {model_name}")
       _, resolved_model_name = get_llm(model=model_name)
       logging.info("Using model %s for additional metrics", resolved_model_name)
       embeddings = EMBEDDING_FUNCTION
       embedding_model = LangchainEmbeddingsWrapper(embeddings=embeddings)
       rouge_scorer = RougeScore()
       semantic_scorer = SemanticSimilarity()
       semantic_scorer.embeddings = embedding_model
       metrics = []
       answers_list = list(answers)
       contexts_list = list(contexts)
       min_len = min(len(answers_list), len(contexts_list))
       if min_len == 0:
           logging.warning("Empty answers or contexts in get_additional_metrics")
           return []

       if len(answers_list) != len(contexts_list):
           logging.warning(
               "Mismatched lengths for answers (%d) and contexts (%d); truncating to %d",
               len(answers_list), len(contexts_list), min_len,
           )
           answers_list = answers_list[:min_len]
           contexts_list = contexts_list[:min_len]
       for response, context in zip(answers_list, contexts_list):
           sample = SingleTurnSample(response=response, reference=reference)
           rouge_score = await rouge_scorer.single_turn_ascore(sample)
           semantic_score = await semantic_scorer.single_turn_ascore(sample)
           metrics.append(
               {
                   "rouge_score": round(rouge_score, 4),
                   "semantic_score": round(semantic_score, 4),
               }
           )
       logging.info(
           "Computed additional metrics for %d samples (model=%s)",
           len(metrics),
           resolved_model_name,
       )
       return metrics
   except Exception as e:
       logging.exception("Error in get_additional_metrics")
       return {"error": str(e)}
   

def custom_is_finished_parser(response) -> bool:
    is_finished_list = []
    for g in response.flatten():
        if not getattr(g, "generations", None):
            is_finished_list.append(True)
            continue
        if not g.generations[0]:
            is_finished_list.append(True)
            continue

        resp = g.generations[0][0]
        if getattr(resp, "generation_info", None) is not None:
            finish_reason = resp.generation_info.get("finish_reason")
            if finish_reason is not None:
                is_finished_list.append(finish_reason == "STOP")
                continue

        if isinstance(resp, ChatGeneration) and t.cast(ChatGeneration, resp).message is not None:
            resp_message: BaseMessage = t.cast(ChatGeneration, resp).message
            finish_reason = resp_message.response_metadata.get("finish_reason")
            if finish_reason is not None:
                is_finished_list.append(finish_reason == "STOP")
                continue

        is_finished_list.append(True)
    return all(is_finished_list)