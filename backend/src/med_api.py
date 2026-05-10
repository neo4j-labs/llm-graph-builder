"""
Simplified API routes for the Medical Knowledge Graph system.
Provides /api/* endpoints consumed by the new React frontend.
"""

import os
import json
import logging
import asyncio
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from sse_starlette.sse import EventSourceResponse

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

WAREHOUSE_PATH = os.getenv("WAREHOUSE_PATH", "/data/lidubai/lidubai/hackathon/warehouse")


def ok(data=None, message="success"):
    return {"status": "success", "message": message, "data": data}


def fail(message: str, detail: str = ""):
    return {"status": "failed", "message": message, "error": detail}


# ─── Request Models ───────────────────────────────────────────────

class KGBuildRequest(BaseModel):
    textbook_id: str

class IntegrateRequest(BaseModel):
    textbook_ids: list[str]

class RAGIndexRequest(BaseModel):
    textbook_ids: list[str]

class RAGQueryRequest(BaseModel):
    question: str
    document_names: Optional[list[str]] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: Optional[list[dict]] = None


# ─── In-Memory State ─────────────────────────────────────────────

_textbooks: dict = {}
_kg_data: dict = {}
_integration_result: dict = {}


# ─── File Management ─────────────────────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a textbook file (PDF/MD/TXT/DOCX)."""
    upload_dir = Path(WAREHOUSE_PATH) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = file.filename or "unknown"
    dest = upload_dir / filename
    content = await file.read()
    dest.write_bytes(content)

    file_id = f"upload_{uuid.uuid4().hex[:8]}"
    title = filename.rsplit(".", 1)[0] if "." in filename else filename
    text = content.decode("utf-8", errors="replace")

    chapters = [{"title": title, "content": text}]
    _textbooks[file_id] = {
        "textbook_id": file_id,
        "filename": filename,
        "title": title,
        "chapters": chapters,
    }

    return ok({
        "id": file_id,
        "filename": filename,
        "title": title,
        "format": filename.rsplit(".", 1)[-1] if "." in filename else "unknown",
        "size": len(content),
        "chapterCount": len(chapters),
        "status": "completed",
    })


@router.post("/parse/mineru")
async def load_mineru_textbooks():
    """Load all MinerU pre-extracted textbooks."""
    global _textbooks, _kg_data
    try:
        from src.mineru_loader import load_all_textbooks
        textbooks = load_all_textbooks(WAREHOUSE_PATH)
        cached_ids = _scan_kg_cache()
        result = []
        for tb in textbooks:
            tid = tb["textbook_id"]
            _textbooks[tid] = tb
            has_kg = tid in cached_ids
            if has_kg and tid not in _kg_data:
                kg = _load_kg_cache(tid)
                if kg:
                    _kg_data[tid] = kg
            result.append({
                "id": tid,
                "filename": tb.get("filename", ""),
                "format": "pdf",
                "size": tb.get("total_chars", 0),
                "status": "completed",
                "title": tb.get("title", ""),
                "totalPages": tb.get("total_pages", 0),
                "totalChars": tb.get("total_chars", 0),
                "chapterCount": len(tb.get("chapters", [])),
                "hasKgCache": has_kg,
            })
        return ok(result, f"已加载 {len(textbooks)} 本教材")
    except Exception as e:
        logger.exception("Failed to load MinerU textbooks")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources")
async def get_source_list():
    """Get list of loaded textbooks."""
    result = []
    for tid, tb in _textbooks.items():
        result.append({
            "id": tid,
            "filename": tb.get("filename", ""),
            "format": "pdf",
            "size": tb.get("total_chars", 0),
            "status": "completed",
            "title": tb.get("title", ""),
            "totalPages": tb.get("total_pages", 0),
            "totalChars": tb.get("total_chars", 0),
            "chapterCount": len(tb.get("chapters", [])),
        })
    return ok(result)


# ─── Textbook Preview ─────────────────────────────────────────────

@router.get("/textbook/{textbook_id}/preview")
async def preview_textbook(textbook_id: str):
    """Preview MinerU extracted content for a textbook."""
    tb = _textbooks.get(textbook_id)
    if not tb:
        raise HTTPException(status_code=404, detail=f"Textbook {textbook_id} not found")

    chapters = []
    for ch in tb.get("chapters", []):
        content = ch.get("content", "")
        chapters.append({
            "title": ch.get("title", "未知章节"),
            "charCount": ch.get("char_count", len(content)),
            "preview": content[:500] + ("..." if len(content) > 500 else ""),
        })

    return ok({
        "id": textbook_id,
        "title": tb.get("title", ""),
        "totalChars": tb.get("total_chars", 0),
        "totalPages": tb.get("total_pages", 0),
        "chapterCount": len(chapters),
        "chapters": chapters,
    })


# ─── KG Cache Persistence ────────────────────────────────────────

KG_CACHE_DIR = Path(WAREHOUSE_PATH) / "kg_cache"


def _kg_cache_path(textbook_id: str) -> Path:
    return KG_CACHE_DIR / f"{textbook_id}.json"


def _save_kg_cache(textbook_id: str, kg_data: dict):
    KG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(_kg_cache_path(textbook_id), "w", encoding="utf-8") as f:
        json.dump(kg_data, f, ensure_ascii=False, indent=2)
    logger.info(f"KG cache saved: {textbook_id}")


def _load_kg_cache(textbook_id: str) -> dict | None:
    p = _kg_cache_path(textbook_id)
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        logger.info(f"KG cache hit: {textbook_id}")
        return data
    return None


def _scan_kg_cache() -> set:
    """Return set of textbook_ids that have cached KG data."""
    if not KG_CACHE_DIR.exists():
        return set()
    return {p.stem for p in KG_CACHE_DIR.glob("*.json")}


# ─── Knowledge Graph ─────────────────────────────────────────────

@router.post("/kg/build")
async def build_knowledge_graph(req: KGBuildRequest):
    """Build knowledge graph for a single textbook (with cache)."""
    global _kg_data
    tb = _textbooks.get(req.textbook_id)
    if not tb:
        raise HTTPException(status_code=404, detail=f"Textbook {req.textbook_id} not found")

    cached = _load_kg_cache(req.textbook_id)
    if cached:
        _kg_data[req.textbook_id] = cached
        nodes = [_format_node(n) for n in cached.get("nodes", [])]
        relations = [_format_relation(r) for r in cached.get("relations", [])]
        return ok({"nodes": nodes, "relations": relations})

    try:
        from src.knowledge_extract import extract_knowledge_from_textbook
        kg = await extract_knowledge_from_textbook(tb)
        _kg_data[req.textbook_id] = kg
        _save_kg_cache(req.textbook_id, kg)

        nodes = [_format_node(n) for n in kg.get("nodes", [])]
        relations = [_format_relation(r) for r in kg.get("relations", [])]
        return ok({"nodes": nodes, "relations": relations})
    except Exception as e:
        logger.exception(f"Failed to build KG for {req.textbook_id}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/visualize")
async def visualize_knowledge_graph(textbook_ids: Optional[str] = None):
    """Get graph visualization data."""
    ids = textbook_ids.split(",") if textbook_ids else list(_kg_data.keys())
    all_nodes = []
    all_relations = []
    for tid in ids:
        kg = _kg_data.get(tid, {})
        all_nodes.extend(kg.get("nodes", []))
        all_relations.extend(kg.get("relations", []))

    if _integration_result:
        decisions = _integration_result.get("decisions", [])
        merged_ids = set()
        removed_ids = set()
        for d in decisions:
            if d.get("action") == "merge":
                merged_ids.update(d.get("affected_nodes", []))
            elif d.get("action") == "remove":
                removed_ids.update(d.get("affected_nodes", []))
        for n in all_nodes:
            nid = n.get("id", "")
            if nid in removed_ids:
                n["status"] = "removed"
            elif nid in merged_ids:
                n["status"] = "merged"
            else:
                n["status"] = "kept"

    return ok({
        "nodes": [_format_node(n) for n in all_nodes],
        "relations": [_format_relation(r) for r in all_relations],
    })


# ─── Integration ─────────────────────────────────────────────────

@router.post("/kg/integrate")
async def integrate_knowledge_graphs(req: IntegrateRequest):
    """Execute cross-textbook knowledge integration."""
    global _integration_result
    textbook_data = []
    for tid in req.textbook_ids:
        kg = _kg_data.get(tid)
        if kg:
            tb = _textbooks.get(tid, {})
            textbook_data.append({
                "textbook_id": tid,
                "textbook_name": tb.get("title", tid),
                "nodes": kg.get("nodes", []),
                "relations": kg.get("relations", []),
            })

    if len(textbook_data) < 2:
        raise HTTPException(status_code=400, detail="至少需要2本已构建图谱的教材")

    try:
        from src.integration import integrate_knowledge_graphs as do_integrate
        result = await do_integrate(textbook_data)
        _integration_result = result
        return ok(result)
    except Exception as e:
        logger.exception("Integration failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─── RAG ─────────────────────────────────────────────────────────

@router.post("/rag/index")
async def build_rag_index(req: RAGIndexRequest):
    """Build FAISS vector index from textbooks."""
    from src.rag_pipeline import build_index
    textbooks = [_textbooks[tid] for tid in req.textbook_ids if tid in _textbooks]
    if not textbooks:
        raise HTTPException(status_code=400, detail="No valid textbooks found")
    result = await asyncio.to_thread(build_index, textbooks)
    return ok({"indexed": result["indexed_books"], "chunks": result["total_chunks"]})


@router.post("/rag/query")
async def rag_query(req: RAGQueryRequest):
    """Answer a question using RAG pipeline."""
    from src.rag_pipeline import query
    result = await asyncio.to_thread(query, req.question, 5, req.document_names)
    return ok(result)


@router.get("/rag/status")
async def rag_status():
    """Get RAG index status."""
    from src.rag_pipeline import get_index_status
    status = get_index_status()
    return ok({"indexedBooks": status["indexed_books"], "totalChunks": status["total_chunks"]})


# ─── Chat ────────────────────────────────────────────────────────

_chat_sessions: dict = {}

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """Multi-turn chat with integration context."""
    from src.rag_pipeline import query as rag_query_fn
    result = await asyncio.to_thread(rag_query_fn, req.message)
    return ok({
        "role": "assistant",
        "content": result["answer"],
        "timestamp": int(__import__("time").time() * 1000),
        "citations": result.get("citations", []),
    })


# ─── Report ──────────────────────────────────────────────────────

@router.get("/report")
async def get_integration_report():
    """Get integration report with stats and example decisions."""
    if not _integration_result:
        return ok({"overview": None, "decisions": [], "examples": []})

    stats = _integration_result.get("statistics", {})
    decisions = _integration_result.get("decisions", [])
    examples = [d for d in decisions if d.get("action") == "merge"][:5]

    return ok({
        "overview": stats,
        "decisions": decisions,
        "examples": examples,
    })


# ─── SSE Stream Endpoints ────────────────────────────────────────

@router.get("/kg/build/stream")
async def build_kg_stream(textbook_id: str):
    """SSE stream for knowledge graph building progress (with cache)."""
    tb = _textbooks.get(textbook_id)
    if not tb:
        raise HTTPException(status_code=404, detail=f"Textbook {textbook_id} not found")

    cached = _load_kg_cache(textbook_id)
    if cached:
        _kg_data[textbook_id] = cached
        nodes = [_format_node(n) for n in cached.get("nodes", [])]
        relations = [_format_relation(r) for r in cached.get("relations", [])]

        async def cached_generator():
            yield {"event": "progress", "data": json.dumps({"event": "progress", "phase": "cache", "step": "命中本地缓存，正在加载...", "current": 1, "total": 1, "percent": 90, "partialResult": {"nodesCount": len(nodes), "relationsCount": len(relations)}}, ensure_ascii=False)}
            yield {"event": "complete", "data": json.dumps({"event": "complete", "phase": "done", "step": "从缓存加载完成", "current": 1, "total": 1, "percent": 100, "partialResult": {"nodesCount": len(nodes), "relationsCount": len(relations)}}, ensure_ascii=False)}
            yield {"event": "result", "data": json.dumps({"event": "result", "data": {"nodes": nodes, "relations": relations}}, ensure_ascii=False)}

        return EventSourceResponse(cached_generator())

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: dict):
            await queue.put(event)

        async def run_task():
            try:
                from src.knowledge_extract import extract_knowledge_from_textbook
                kg = await extract_knowledge_from_textbook(tb, on_progress=on_progress)
                _kg_data[textbook_id] = kg
                _save_kg_cache(textbook_id, kg)
                nodes = [_format_node(n) for n in kg.get("nodes", [])]
                relations = [_format_relation(r) for r in kg.get("relations", [])]
                await queue.put({"event": "result", "data": {"nodes": nodes, "relations": relations}})
            except Exception as e:
                await queue.put({"event": "error", "step": str(e)})
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_task())

        while True:
            msg = await queue.get()
            if msg is None:
                break
            yield {"event": msg.get("event", "progress"), "data": json.dumps(msg, ensure_ascii=False)}

    return EventSourceResponse(event_generator())


@router.get("/kg/integrate/stream")
async def integrate_kg_stream(textbook_ids: str):
    """SSE stream for cross-textbook integration progress."""
    ids = textbook_ids.split(",")
    textbook_data = []
    for tid in ids:
        kg = _kg_data.get(tid)
        if kg:
            tb = _textbooks.get(tid, {})
            textbook_data.append({
                "textbook_id": tid,
                "textbook_name": tb.get("title", tid),
                "nodes": kg.get("nodes", []),
                "relations": kg.get("relations", []),
            })

    if len(textbook_data) < 2:
        raise HTTPException(status_code=400, detail="至少需要2本已构建图谱的教材")

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: dict):
            await queue.put(event)

        async def run_task():
            try:
                from src.integration import integrate_knowledge_graphs as do_integrate
                result = await do_integrate(textbook_data, on_progress=on_progress)
                global _integration_result
                _integration_result = result
                await queue.put({"event": "result", "data": result})
            except Exception as e:
                await queue.put({"event": "error", "step": str(e)})
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_task())

        while True:
            msg = await queue.get()
            if msg is None:
                break
            yield {"event": msg.get("event", "progress"), "data": json.dumps(msg, ensure_ascii=False, default=str)}

    return EventSourceResponse(event_generator())


@router.get("/rag/index/stream")
async def build_rag_index_stream(textbook_ids: str):
    """SSE stream for RAG index building progress."""
    ids = textbook_ids.split(",")
    textbooks = [_textbooks[tid] for tid in ids if tid in _textbooks]
    if not textbooks:
        raise HTTPException(status_code=400, detail="No valid textbooks found")

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: dict):
            await queue.put(event)

        def run_sync():
            from src.rag_pipeline import build_index
            return build_index(textbooks, on_progress=on_progress)

        async def run_task():
            try:
                result = await asyncio.to_thread(run_sync)
                await queue.put({
                    "event": "result",
                    "data": {"indexed": result["indexed_books"], "chunks": result["total_chunks"]}
                })
            except Exception as e:
                await queue.put({"event": "error", "step": str(e)})
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_task())

        while True:
            msg = await queue.get()
            if msg is None:
                break
            yield {"event": msg.get("event", "progress"), "data": json.dumps(msg, ensure_ascii=False)}

    return EventSourceResponse(event_generator())


# ─── Helpers ─────────────────────────────────────────────────────

def _format_node(n: dict) -> dict:
    return {
        "id": n.get("id", ""),
        "name": n.get("name", ""),
        "definition": n.get("definition", ""),
        "category": n.get("category", ""),
        "chapter": n.get("chapter", ""),
        "page": n.get("page", 0),
        "textbookId": n.get("textbook_id", ""),
        "textbookTitle": n.get("textbook_title", ""),
        "frequency": n.get("frequency", 1),
        "status": n.get("status", "kept"),
    }


def _format_relation(r: dict) -> dict:
    return {
        "source": r.get("source", ""),
        "target": r.get("target", ""),
        "relationType": r.get("relation_type", "parallel"),
        "description": r.get("description", ""),
    }
