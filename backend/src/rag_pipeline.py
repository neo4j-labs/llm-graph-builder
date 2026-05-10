"""
Simplified RAG pipeline for medical textbook QA.
Uses FAISS for vector storage and BGE-small-zh for embeddings.
"""

import os
import json
import logging
import hashlib
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()
logger = logging.getLogger(__name__)

_faiss_store = None
_embedding_fn = None
_index_meta: dict = {"indexed_books": 0, "total_chunks": 0}

SYSTEM_PROMPT = """你是一个医学知识问答助手。请基于以下上下文回答用户问题。

【约束】
1. 仅使用提供的上下文，不使用自身知识
2. 每个论断必须附带引用：[教材名, 第X章, 第X页]
3. 若上下文不足以回答，明确说明"当前知识库中未找到相关信息"
4. 使用中文回答

【上下文】
{context}"""


def _get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is not None:
        return _embedding_fn

    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
    model_name = os.getenv("EMBEDDING_MODEL", "/data/models/bge-m3")

    try:
        from langchain_huggingface import HuggingFaceEmbeddings
    except ImportError:
        from langchain_community.embeddings import HuggingFaceEmbeddings

    try:
        _embedding_fn = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cuda"},
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.info(f"Loaded embedding model on GPU: {model_name}")
    except Exception:
        _embedding_fn = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.info(f"Loaded embedding model on CPU: {model_name}")
    return _embedding_fn


def _get_llm():
    return ChatOpenAI(
        base_url=os.getenv("LLM_BASE_URL"),
        api_key=os.getenv("LLM_API_KEY"),
        model=os.getenv("LLM_MODEL_NAME", "gpt-4.1-2025-04-14"),
        temperature=0,
    )


def _chunk_textbook(textbook: dict) -> list[Document]:
    """Split a parsed textbook into LangChain Documents with metadata."""
    chunk_size = int(os.getenv("CHUNK_SIZE", "600"))
    chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "80"))
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", "；", "，", " "],
    )

    docs = []
    for chapter in textbook.get("chapters", []):
        content = chapter.get("content", "")
        if not content.strip():
            continue
        chunks = splitter.split_text(content)
        for i, chunk_text in enumerate(chunks):
            docs.append(Document(
                page_content=chunk_text,
                metadata={
                    "textbook_id": textbook.get("textbook_id", ""),
                    "textbook_title": textbook.get("title", ""),
                    "chapter_id": chapter.get("chapter_id", ""),
                    "chapter_title": chapter.get("title", ""),
                    "page_start": chapter.get("page_start", 0),
                    "page_end": chapter.get("page_end", 0),
                    "chunk_index": i,
                },
            ))
    return docs


def build_index(textbooks: list[dict]) -> dict:
    """Build FAISS index from parsed textbooks."""
    global _faiss_store, _index_meta

    from langchain_community.vectorstores import FAISS

    all_docs: list[Document] = []
    for tb in textbooks:
        docs = _chunk_textbook(tb)
        all_docs.extend(docs)
        logger.info(f"Chunked {tb.get('title', '?')}: {len(docs)} chunks")

    if not all_docs:
        raise ValueError("No documents to index")

    embedding = _get_embedding_fn()
    _faiss_store = FAISS.from_documents(all_docs, embedding)
    _index_meta = {"indexed_books": len(textbooks), "total_chunks": len(all_docs)}

    index_dir = Path(os.getenv("WAREHOUSE_PATH", ".")) / "faiss_index"
    index_dir.mkdir(parents=True, exist_ok=True)
    _faiss_store.save_local(str(index_dir))
    logger.info(f"FAISS index saved: {len(all_docs)} chunks from {len(textbooks)} books")

    return _index_meta


def load_index() -> bool:
    """Try to load existing FAISS index."""
    global _faiss_store, _index_meta
    from langchain_community.vectorstores import FAISS

    index_dir = Path(os.getenv("WAREHOUSE_PATH", ".")) / "faiss_index"
    if not (index_dir / "index.faiss").exists():
        return False

    embedding = _get_embedding_fn()
    _faiss_store = FAISS.load_local(str(index_dir), embedding, allow_dangerous_deserialization=True)
    total = _faiss_store.index.ntotal
    _index_meta = {"indexed_books": 0, "total_chunks": total}
    logger.info(f"Loaded existing FAISS index: {total} chunks")
    return True


def get_index_status() -> dict:
    return _index_meta.copy()


def query(question: str, top_k: int = 5, document_names: Optional[list[str]] = None) -> dict:
    """Execute a RAG query and return answer with citations."""
    global _faiss_store
    if _faiss_store is None:
        if not load_index():
            return {
                "answer": "尚未建立索引，请先加载教材并建立向量索引。",
                "citations": [],
                "source_chunks": [],
            }

    retriever = _faiss_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": top_k},
    )
    docs = retriever.invoke(question)

    if document_names:
        docs = [d for d in docs if d.metadata.get("textbook_title") in document_names]

    if not docs:
        return {
            "answer": "当前知识库中未找到与问题相关的信息。",
            "citations": [],
            "source_chunks": [],
        }

    context_parts = []
    citations = []
    source_chunks = []

    for i, doc in enumerate(docs):
        meta = doc.metadata
        source_tag = f"[{meta.get('textbook_title', '?')}, {meta.get('chapter_title', '?')}, 第{meta.get('page_start', '?')}页]"
        context_parts.append(f"【来源{i+1}】{source_tag}\n{doc.page_content}")
        citations.append({
            "textbook": meta.get("textbook_title", ""),
            "chapter": meta.get("chapter_title", ""),
            "page": meta.get("page_start", 0),
            "relevanceScore": round(1.0 - i * 0.05, 2),
            "chunkContent": doc.page_content[:200],
        })
        source_chunks.append(doc.page_content)

    context = "\n\n".join(context_parts)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    llm = _get_llm()
    chain = prompt | llm
    response = chain.invoke({"context": context, "question": question})

    return {
        "answer": response.content,
        "citations": citations,
        "source_chunks": source_chunks,
    }
