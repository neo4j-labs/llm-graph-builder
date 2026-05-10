# 实时进度显示与视觉升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为三个长时间操作（KG 构建、整合、RAG 索引）添加 SSE 实时进度推送，并升级前端进度展示 UI。

**Architecture:** 后端为每个长操作新增 GET SSE 端点，通过 `sse-starlette` 的 `EventSourceResponse` 推送进度事件。前端新建 `useTaskProgress` hook 管理 `EventSource` 连接，新建 `TaskProgress` 悬浮面板组件展示实时进度。三个核心后端模块添加可选 `on_progress` 回调。

**Tech Stack:** FastAPI + sse-starlette (已安装) / React 19 + Ant Design 6 + Tailwind CSS 4 / 浏览器原生 EventSource API

**Spec:** `docs/superpowers/specs/2026-05-10-realtime-progress-design.md`

**分支:** `feat/realtime-progress`（从 `main` 创建）

---

## 文件结构

### 新建文件
| 文件 | 职责 |
|------|------|
| `frontend/src/hooks/useTaskProgress.ts` | SSE 连接管理 + TaskState 状态机 |
| `frontend/src/components/TaskProgress/index.tsx` | 进度面板 UI 组件 |

### 修改文件
| 文件 | 改动范围 |
|------|---------|
| `backend/src/knowledge_extract.py:475-540` | `extract_knowledge_from_textbook` 添加 `on_progress` 参数 |
| `backend/src/integration.py:654-725` | `integrate_knowledge_graphs` 添加 `on_progress` 参数 |
| `backend/src/rag_pipeline.py:109-133` | `build_index` 添加 `on_progress` 参数 |
| `backend/src/med_api.py` | 新增 3 个 SSE 端点 |
| `frontend/src/types/index.ts` | 新增 `TaskEvent` / `TaskState` 类型 |
| `frontend/src/services/api.ts` | 新增 3 个 stream URL 常量 |
| `frontend/src/components/FileManager/index.tsx` | 接入 useTaskProgress |
| `frontend/src/components/IntegrationPanel/index.tsx` | 接入 useTaskProgress |
| `frontend/src/components/RAGChat/index.tsx` | 接入 useTaskProgress |
| `frontend/src/App.tsx` | 引入 TaskProgress，传递 task state |
| `frontend/src/index.css` | 新增动画 CSS |

---

## Task 1: 创建功能分支

**Files:** 无代码文件改动

- [ ] **Step 1: 从 main 创建功能分支**

```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA
git checkout main
git checkout -b feat/realtime-progress
```

- [ ] **Step 2: 验证分支**

Run: `git branch --show-current`
Expected: `feat/realtime-progress`

---

## Task 2: 后端 — knowledge_extract.py 添加进度回调

**Files:**
- Modify: `backend/src/knowledge_extract.py:475-540`

- [ ] **Step 1: 修改函数签名和循环体**

在 `extract_knowledge_from_textbook` 中添加 `on_progress` 参数，在章节循环中调用回调：

```python
async def extract_knowledge_from_textbook(
    textbook: Dict[str, Any],
    llm: Optional[ChatOpenAI] = None,
    on_progress: Optional[Any] = None
) -> Dict[str, List]:
    """
    从整本教材提取知识点（遍历所有章节）
    
    Args:
        textbook: 教材信息字典，包含 textbook_id, title, chapters (list)
        llm: LLM 实例
        on_progress: 可选进度回调，签名 async def callback(event: dict)
    
    Returns:
        dict: 整合后的知识点和关系
    """
    textbook_id = textbook.get("textbook_id", "unknown")
    textbook_title = textbook.get("title", "未命名教材")
    chapters = textbook.get("chapters", [])
    
    logger.info(f"开始提取教材知识点: {textbook_title} (ID: {textbook_id})")
    logger.info(f"共 {len(chapters)} 个章节")
    
    if not chapters:
        logger.warning(f"教材 {textbook_id} 无章节内容")
        return {"nodes": [], "relations": []}
    
    if llm is None:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            base_url=os.getenv("LLM_BASE_URL"),
            api_key=os.getenv("LLM_API_KEY"),
            model=os.getenv("LLM_MODEL_NAME", "gpt-4.1-2025-04-14"),
            temperature=0,
        )
        logger.info(f"创建 LLM 实例: {os.getenv('LLM_MODEL_NAME')}")
    
    textbook_info = {
        "textbook_id": textbook_id,
        "title": textbook_title
    }
    
    all_nodes = []
    all_relations = []
    
    for i, chapter in enumerate(chapters):
        chapter_title = chapter.get('title', 'unknown')
        logger.info(f"处理章节 {i+1}/{len(chapters)}: {chapter_title}")
        
        if on_progress:
            await on_progress({
                "event": "progress",
                "phase": "extracting",
                "step": f"正在提取第{i+1}章: {chapter_title}",
                "current": i + 1,
                "total": len(chapters),
                "percent": round((i + 1) / len(chapters) * 90),
                "partialResult": {"nodesCount": len(all_nodes), "relationsCount": len(all_relations)}
            })
        
        result = await extract_knowledge_from_chapter(chapter, textbook_info, llm)
        
        all_nodes.extend(result.get("nodes", []))
        all_relations.extend(result.get("relations", []))
        
        if i < len(chapters) - 1:
            await asyncio.sleep(1)
    
    if on_progress:
        await on_progress({
            "event": "complete",
            "phase": "done",
            "step": "知识图谱构建完成",
            "current": len(chapters),
            "total": len(chapters),
            "percent": 100,
            "partialResult": {"nodesCount": len(all_nodes), "relationsCount": len(all_relations)}
        })
    
    logger.info(f"教材 {textbook_title} 提取完成：{len(all_nodes)} 个知识点，{len(all_relations)} 个关系")
    
    return {
        "nodes": all_nodes,
        "relations": all_relations,
        "textbook_id": textbook_id,
        "textbook_title": textbook_title,
        "chapter_count": len(chapters)
    }
```

- [ ] **Step 2: 验证原有测试不受影响**

Run: `cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend && conda run -n medkg python -c "from src.knowledge_extract import extract_knowledge_from_textbook; print('import OK')"`
Expected: `import OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/knowledge_extract.py
git commit -m "feat(backend): add on_progress callback to knowledge extraction"
```

---

## Task 3: 后端 — integration.py 添加进度回调

**Files:**
- Modify: `backend/src/integration.py:654-725`

- [ ] **Step 1: 修改函数签名和阶段回调**

```python
async def integrate_knowledge_graphs(
    all_textbook_data: List[Dict[str, Any]],
    llm: Optional[ChatOpenAI] = None,
    embedding_model: Optional[SentenceTransformer] = None,
    target_compression_ratio: float = 0.30,
    on_progress: Optional[Any] = None
) -> Dict[str, Any]:
    """
    知识图谱整合主入口函数
    
    Args:
        all_textbook_data: 所有教材的知识图谱数据列表
        llm: LLM 实例（可选）
        embedding_model: 嵌入模型实例（可选）
        target_compression_ratio: 目标压缩比（默认 0.30）
        on_progress: 可选进度回调，签名 async def callback(event: dict)
        
    Returns:
        整合结果和统计信息
    """
    logger.info(f"Starting knowledge graph integration for {len(all_textbook_data)} textbooks")
    
    all_nodes = []
    for textbook in all_textbook_data:
        textbook_id = textbook.get("textbook_id")
        textbook_name = textbook.get("textbook_name", textbook_id)
        nodes = textbook.get("nodes", [])
        
        for node in nodes:
            node["textbook_id"] = textbook_id
            node["textbook_name"] = textbook_name
            all_nodes.append(node)
    
    logger.info(f"Total nodes to integrate: {len(all_nodes)}")
    
    integrator = KnowledgeGraphIntegrator(
        llm=llm,
        embedding_model=embedding_model,
        target_compression_ratio=target_compression_ratio
    )
    
    try:
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "alignment",
                "step": "阶段一：语义对齐 — 计算节点嵌入向量",
                "current": 1, "total": 4, "percent": 10,
                "partialResult": {"totalNodes": len(all_nodes)}
            })
        
        candidate_pairs = await integrator.compute_semantic_alignment(all_nodes)
        
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "verification",
                "step": f"阶段二：LLM 验证 — 共 {len(candidate_pairs)} 对候选",
                "current": 2, "total": 4, "percent": 35,
                "partialResult": {"candidatePairs": len(candidate_pairs)}
            })
        
        verified_results = await integrator.llm_verify_alignment(candidate_pairs)
        
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "decision",
                "step": "阶段三：生成整合决策",
                "current": 3, "total": 4, "percent": 65,
                "partialResult": {"verifiedPairs": len(verified_results)}
            })
        
        decisions = integrator.make_integration_decisions(verified_results, all_nodes)
        
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "compression",
                "step": "阶段四：调整压缩比",
                "current": 4, "total": 4, "percent": 85,
                "partialResult": {}
            })
        
        final_decisions = await integrator.adjust_compression(decisions, all_nodes)
        
        if on_progress:
            stats = final_decisions.get("statistics", {})
            await on_progress({
                "event": "complete", "phase": "done",
                "step": "跨教材整合完成",
                "current": 4, "total": 4, "percent": 100,
                "partialResult": {
                    "compressionRatio": stats.get("compression_ratio", 0),
                    "mergeCount": stats.get("merge_count", 0),
                    "decisionsCount": len(final_decisions.get("decisions", []))
                }
            })
        
        logger.info("Knowledge graph integration completed successfully")
        return final_decisions
        
    except Exception as e:
        logger.error(f"Error during knowledge graph integration: {e}", exc_info=True)
        if on_progress:
            await on_progress({
                "event": "error", "phase": "error",
                "step": f"整合失败: {str(e)}",
                "current": 0, "total": 0, "percent": 0,
                "partialResult": {}
            })
        raise
```

- [ ] **Step 2: 验证 import**

Run: `cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend && conda run -n medkg python -c "from src.integration import integrate_knowledge_graphs; print('import OK')"`
Expected: `import OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/integration.py
git commit -m "feat(backend): add on_progress callback to integration module"
```

---

## Task 4: 后端 — rag_pipeline.py 添加进度回调

**Files:**
- Modify: `backend/src/rag_pipeline.py:109-133`

- [ ] **Step 1: 修改 build_index 函数**

```python
def build_index(textbooks: list[dict], on_progress=None) -> dict:
    """Build FAISS index from parsed textbooks."""
    global _faiss_store, _index_meta

    from langchain_community.vectorstores import FAISS
    import asyncio

    all_docs: list[Document] = []
    for i, tb in enumerate(textbooks):
        if on_progress:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(on_progress({
                        "event": "progress", "phase": "chunking",
                        "step": f"分块处理: {tb.get('title', '?')}",
                        "current": i + 1, "total": len(textbooks),
                        "percent": round((i + 1) / len(textbooks) * 50),
                        "partialResult": {"chunksCount": len(all_docs)}
                    }))
            except RuntimeError:
                pass

        docs = _chunk_textbook(tb)
        all_docs.extend(docs)
        logger.info(f"Chunked {tb.get('title', '?')}: {len(docs)} chunks")

    if not all_docs:
        raise ValueError("No documents to index")

    if on_progress:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(on_progress({
                    "event": "progress", "phase": "embedding",
                    "step": f"构建向量索引 — 共 {len(all_docs)} 个知识块",
                    "current": len(textbooks), "total": len(textbooks),
                    "percent": 70,
                    "partialResult": {"chunksCount": len(all_docs)}
                }))
        except RuntimeError:
            pass

    embedding = _get_embedding_fn()
    _faiss_store = FAISS.from_documents(all_docs, embedding)
    _index_meta = {"indexed_books": len(textbooks), "total_chunks": len(all_docs)}

    index_dir = Path(os.getenv("WAREHOUSE_PATH", ".")) / "faiss_index"
    index_dir.mkdir(parents=True, exist_ok=True)
    _faiss_store.save_local(str(index_dir))
    logger.info(f"FAISS index saved: {len(all_docs)} chunks from {len(textbooks)} books")

    if on_progress:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(on_progress({
                    "event": "complete", "phase": "done",
                    "step": "RAG 索引构建完成",
                    "current": len(textbooks), "total": len(textbooks),
                    "percent": 100,
                    "partialResult": {"indexedBooks": len(textbooks), "totalChunks": len(all_docs)}
                }))
        except RuntimeError:
            pass

    return _index_meta
```

注意：`build_index` 是同步函数（通过 `asyncio.to_thread` 调用），所以回调使用 `asyncio.ensure_future` 将协程调度到事件循环。

- [ ] **Step 2: 验证 import**

Run: `cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend && conda run -n medkg python -c "from src.rag_pipeline import build_index; print('import OK')"`
Expected: `import OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/rag_pipeline.py
git commit -m "feat(backend): add on_progress callback to RAG index builder"
```

---

## Task 5: 后端 — med_api.py 添加 SSE 流式端点

**Files:**
- Modify: `backend/src/med_api.py`

- [ ] **Step 1: 添加 import 和 SSE 端点**

在文件顶部 import 区添加：

```python
from sse_starlette.sse import EventSourceResponse
```

在文件末尾 `# ─── Helpers` 区域之前，添加三个 SSE 端点：

```python
# ─── SSE Stream Endpoints ────────────────────────────────────────

@router.get("/kg/build/stream")
async def build_kg_stream(textbook_id: str):
    """SSE stream for knowledge graph building progress."""
    tb = _textbooks.get(textbook_id)
    if not tb:
        raise HTTPException(status_code=404, detail=f"Textbook {textbook_id} not found")

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: dict):
            await queue.put(event)

        async def run_task():
            try:
                from src.knowledge_extract import extract_knowledge_from_textbook
                kg = await extract_knowledge_from_textbook(tb, on_progress=on_progress)
                _kg_data[textbook_id] = kg
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
```

- [ ] **Step 2: 验证后端启动**

Run: `cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend && conda run -n medkg python -c "from src.med_api import router; print(f'{len(router.routes)} routes OK')"`
Expected: 包含原有 + 3 个新端点

- [ ] **Step 3: Commit**

```bash
git add backend/src/med_api.py
git commit -m "feat(backend): add SSE stream endpoints for all long-running operations"
```

---

## Task 6: 前端 — 类型定义和 API

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: 添加类型定义**

在 `frontend/src/types/index.ts` 末尾追加：

```typescript
export interface TaskEvent {
  event: 'progress' | 'complete' | 'result' | 'error';
  phase: string;
  step: string;
  current: number;
  total: number;
  percent: number;
  partialResult?: Record<string, any>;
  data?: any;
}

export type TaskType = 'kg_build' | 'integrate' | 'rag_index';

export interface TaskState {
  taskType: TaskType;
  status: 'idle' | 'running' | 'completed' | 'error';
  label: string;
  phase: string;
  step: string;
  current: number;
  total: number;
  percent: number;
  partialResults: Record<string, any>;
  elapsed: number;
  error?: string;
  finalResult?: any;
}
```

- [ ] **Step 2: 添加 stream URL 构建函数**

在 `frontend/src/services/api.ts` 末尾 `export default api;` 之前追加：

```typescript
export function getStreamUrl(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `/api${path}?${query}`;
}

export const STREAM_PATHS = {
  kg_build: '/kg/build/stream',
  integrate: '/kg/integrate/stream',
  rag_index: '/rag/index/stream',
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "feat(frontend): add TaskEvent/TaskState types and stream API helpers"
```

---

## Task 7: 前端 — useTaskProgress hook

**Files:**
- Create: `frontend/src/hooks/useTaskProgress.ts`

- [ ] **Step 1: 创建 hook 文件**

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import type { TaskState, TaskType, TaskEvent } from '../types';
import { getStreamUrl, STREAM_PATHS } from '../services/api';

const INITIAL_STATE: TaskState = {
  taskType: 'kg_build',
  status: 'idle',
  label: '',
  phase: '',
  step: '',
  current: 0,
  total: 0,
  percent: 0,
  partialResults: {},
  elapsed: 0,
};

export function useTaskProgress() {
  const [task, setTask] = useState<TaskState>(INITIAL_STATE);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startTask = useCallback(
    (taskType: TaskType, params: Record<string, string>, label: string) => {
      cleanup();

      const url = getStreamUrl(STREAM_PATHS[taskType], params);
      const es = new EventSource(url);
      esRef.current = es;
      startTimeRef.current = Date.now();

      setTask({
        ...INITIAL_STATE,
        taskType,
        label,
        status: 'running',
        step: '正在初始化...',
      });

      timerRef.current = setInterval(() => {
        setTask((prev) =>
          prev.status === 'running'
            ? { ...prev, elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000) }
            : prev
        );
      }, 1000);

      const handleEvent = (e: MessageEvent) => {
        try {
          const data: TaskEvent = JSON.parse(e.data);
          setTask((prev) => ({
            ...prev,
            phase: data.phase || prev.phase,
            step: data.step || prev.step,
            current: data.current ?? prev.current,
            total: data.total ?? prev.total,
            percent: data.percent ?? prev.percent,
            partialResults: data.partialResult
              ? { ...prev.partialResults, ...data.partialResult }
              : prev.partialResults,
          }));
        } catch {
          // ignore parse errors
        }
      };

      es.addEventListener('progress', handleEvent);

      es.addEventListener('complete', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setTask((prev) => ({
            ...prev,
            status: 'completed',
            percent: 100,
            step: data.step || '已完成',
            phase: 'done',
            partialResults: data.partialResult
              ? { ...prev.partialResults, ...data.partialResult }
              : prev.partialResults,
            elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
          }));
        } catch { /* ignore */ }
        cleanup();
      });

      es.addEventListener('result', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setTask((prev) => ({
            ...prev,
            finalResult: payload.data,
          }));
        } catch { /* ignore */ }
      });

      es.addEventListener('error', (e: any) => {
        if (e.data) {
          try {
            const data = JSON.parse(e.data);
            setTask((prev) => ({
              ...prev,
              status: 'error',
              error: data.step || '未知错误',
              elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
            }));
          } catch { /* ignore */ }
        }
        cleanup();
      });

      es.onerror = () => {
        setTask((prev) => {
          if (prev.status === 'completed') return prev;
          return { ...prev, status: 'error', error: 'SSE 连接断开' };
        });
        cleanup();
      };
    },
    [cleanup]
  );

  const cancelTask = useCallback(() => {
    cleanup();
    setTask((prev) => ({ ...prev, status: 'idle' }));
  }, [cleanup]);

  const resetTask = useCallback(() => {
    cleanup();
    setTask(INITIAL_STATE);
  }, [cleanup]);

  return { task, startTask, cancelTask, resetTask };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useTaskProgress.ts
git commit -m "feat(frontend): create useTaskProgress hook for SSE progress management"
```

---

## Task 8: 前端 — TaskProgress 面板组件 + CSS 动画

**Files:**
- Create: `frontend/src/components/TaskProgress/index.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 添加 CSS 动画**

在 `frontend/src/index.css` 末尾追加：

```css
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes scan-line {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

@keyframes number-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

.animate-scan-line {
  animation: scan-line 2s ease-in-out infinite;
}

.animate-number-pop {
  animation: number-pop 0.3s ease-out;
}

.progress-bar-gradient {
  background: linear-gradient(90deg, #1677ff 0%, #52c41a 100%);
}

.progress-bar-track {
  background: rgba(255, 255, 255, 0.06);
}
```

- [ ] **Step 2: 创建 TaskProgress 组件**

```tsx
import { useEffect, useState } from 'react';
import { Tag } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { TaskState } from '../../types';

interface Props {
  task: TaskState;
  onCancel: () => void;
  onDismiss: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  extracting: '知识提取',
  alignment: '语义对齐',
  verification: 'LLM 验证',
  decision: '生成决策',
  compression: '压缩调整',
  chunking: '文档分块',
  embedding: '向量构建',
  done: '已完成',
  error: '出错',
};

const TASK_LABELS: Record<string, string> = {
  kg_build: '知识图谱构建',
  integrate: '跨教材整合',
  rag_index: 'RAG 索引构建',
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function TaskProgress({ task, onCancel, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (task.status === 'running' || task.status === 'completed' || task.status === 'error') {
      setVisible(true);
    }
  }, [task.status]);

  if (!visible || task.status === 'idle') return null;

  const isRunning = task.status === 'running';
  const isComplete = task.status === 'completed';
  const isError = task.status === 'error';

  const borderColor = isError ? '#ff4d4f' : isComplete ? '#52c41a' : '#1677ff';

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  return (
    <div
      className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border overflow-hidden transition-all duration-500"
      style={{
        background: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(12px)',
        borderColor: borderColor,
        borderLeftWidth: 3,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {isRunning && <ThunderboltOutlined className="text-blue-400 animate-pulse-glow" />}
          {isComplete && <CheckCircleOutlined className="text-green-400" />}
          {isError && <CloseCircleOutlined className="text-red-400" />}
          <span className="font-medium text-sm text-gray-100">
            {TASK_LABELS[task.taskType] || task.taskType}
          </span>
          {task.label && (
            <span className="text-xs text-gray-500">— {task.label}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 tabular-nums">
            {formatElapsed(task.elapsed)}
          </span>
          {isRunning && (
            <span className="text-blue-400 font-bold text-sm tabular-nums">
              {task.percent}%
            </span>
          )}
          {isRunning ? (
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-0.5 rounded border border-gray-700 hover:border-red-400/50"
            >
              取消
            </button>
          ) : (
            <button onClick={handleDismiss} className="text-gray-500 hover:text-gray-300">
              <CloseOutlined className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="px-4 pb-1">
          <div className="progress-bar-track rounded-full h-1.5 overflow-hidden relative">
            <div
              className="progress-bar-gradient h-full rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${task.percent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-1/3 animate-scan-line rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Step Info */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          {isRunning && <LoadingOutlined className="text-blue-400" />}
          <span className="text-gray-300">{task.step}</span>
        </div>

        {/* Steps indicator for multi-step tasks */}
        {task.total > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Array.from({ length: task.total }, (_, i) => {
              const idx = i + 1;
              const done = idx < task.current;
              const active = idx === task.current;
              return (
                <div
                  key={i}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium transition-all duration-300 ${
                    done
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : active
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 animate-pulse-glow'
                        : 'bg-white/5 text-gray-600 border border-white/10'
                  }`}
                >
                  {done ? '✓' : idx}
                </div>
              );
            })}
          </div>
        )}

        {/* Partial Results */}
        {Object.keys(task.partialResults).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {task.partialResults.nodesCount != null && (
              <Tag color="blue" className="!text-xs">{task.partialResults.nodesCount} 知识点</Tag>
            )}
            {task.partialResults.relationsCount != null && (
              <Tag color="cyan" className="!text-xs">{task.partialResults.relationsCount} 关系</Tag>
            )}
            {task.partialResults.chunksCount != null && (
              <Tag color="green" className="!text-xs">{task.partialResults.chunksCount} 知识块</Tag>
            )}
            {task.partialResults.candidatePairs != null && (
              <Tag color="gold" className="!text-xs">{task.partialResults.candidatePairs} 候选对</Tag>
            )}
            {task.partialResults.compressionRatio != null && (
              <Tag color="green" className="!text-xs">
                压缩比 {(task.partialResults.compressionRatio * 100).toFixed(1)}%
              </Tag>
            )}
            {task.partialResults.decisionsCount != null && (
              <Tag color="purple" className="!text-xs">{task.partialResults.decisionsCount} 条决策</Tag>
            )}
            {task.partialResults.totalNodes != null && (
              <Tag color="blue" className="!text-xs">共 {task.partialResults.totalNodes} 节点</Tag>
            )}
          </div>
        )}

        {/* Error Message */}
        {isError && task.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
            {task.error}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TaskProgress/index.tsx frontend/src/index.css
git commit -m "feat(frontend): create TaskProgress panel component with animations"
```

---

## Task 9: 前端 — 接入各组件 + App 整合

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/FileManager/index.tsx`
- Modify: `frontend/src/components/IntegrationPanel/index.tsx`
- Modify: `frontend/src/components/RAGChat/index.tsx`

- [ ] **Step 1: 修改 App.tsx — 引入 hook 和进度面板**

完整替换 `App.tsx`：

```tsx
import { useState } from 'react';
import { ConfigProvider, theme, Layout, Tabs } from 'antd';
import {
  FileTextOutlined,
  NodeIndexOutlined,
  MessageOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import FileManager from './components/FileManager';
import KnowledgeGraph from './components/KnowledgeGraph';
import RAGChat from './components/RAGChat';
import IntegrationPanel from './components/IntegrationPanel';
import Report from './components/Report';
import TaskProgress from './components/TaskProgress';
import { useTaskProgress } from './hooks/useTaskProgress';
import type { TextbookFile, GraphData, IntegrationStats } from './types';

const { Sider, Content } = Layout;

export default function App() {
  const [files, setFiles] = useState<TextbookFile[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], relations: [] });
  const [integrationStats, setIntegrationStats] = useState<IntegrationStats | null>(null);
  const [activeTab, setActiveTab] = useState('rag');
  const { task, startTask, cancelTask, resetTask } = useTaskProgress();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#1677ff', borderRadius: 8 },
      }}
    >
      <Layout className="h-screen">
        <Sider width={280} className="!bg-[#1a1a1a] border-r border-[#303030] overflow-y-auto">
          <div className="p-4">
            <h1 className="text-lg font-bold mb-1 text-white">Med-KG</h1>
            <p className="text-xs text-gray-500 mb-4">医学知识图谱整合系统</p>
            <FileManager
              files={files}
              setFiles={setFiles}
              setGraphData={setGraphData}
              startTask={startTask}
              task={task}
            />
          </div>
        </Sider>

        <Content className="relative bg-[#141414]">
          <KnowledgeGraph data={graphData} />
          {integrationStats && (
            <div className="absolute top-4 right-4 bg-[#1f1f1f]/90 backdrop-blur rounded-lg p-3 text-xs border border-[#303030]">
              <div className="font-medium mb-1">整合统计</div>
              <div>压缩比: <span className="text-green-400">{(integrationStats.compressionRatio * 100).toFixed(1)}%</span></div>
              <div>节点: {integrationStats.originalNodeCount} → {integrationStats.mergedNodeCount}</div>
            </div>
          )}
          <TaskProgress task={task} onCancel={cancelTask} onDismiss={resetTask} />
        </Content>

        <Sider width={380} className="!bg-[#1a1a1a] border-l border-[#303030]">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="h-full [&_.ant-tabs-content]:h-[calc(100vh-46px)] [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:overflow-y-auto"
            centered
            items={[
              {
                key: 'rag',
                label: <span><MessageOutlined /> 问答</span>,
                children: <RAGChat files={files} startTask={startTask} task={task} />,
              },
              {
                key: 'integrate',
                label: <span><NodeIndexOutlined /> 整合</span>,
                children: (
                  <IntegrationPanel
                    files={files}
                    setGraphData={setGraphData}
                    setIntegrationStats={setIntegrationStats}
                    startTask={startTask}
                    task={task}
                  />
                ),
              },
              {
                key: 'report',
                label: <span><BarChartOutlined /> 报告</span>,
                children: <Report stats={integrationStats} />,
              },
            ]}
          />
        </Sider>
      </Layout>
    </ConfigProvider>
  );
}
```

- [ ] **Step 2: 修改 FileManager — 使用 stream API**

替换整个 `FileManager/index.tsx`：

```tsx
import { useState, useCallback, useEffect } from 'react';
import { Upload, Button, List, Tag, message, Divider } from 'antd';
import { CloudUploadOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { TextbookFile, GraphData, TaskState, TaskType } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
  setFiles: React.Dispatch<React.SetStateAction<TextbookFile[]>>;
  setGraphData: React.Dispatch<React.SetStateAction<GraphData>>;
  startTask: (taskType: TaskType, params: Record<string, string>, label: string) => void;
  task: TaskState;
}

const statusColor: Record<string, string> = {
  uploading: 'processing',
  parsing: 'processing',
  completed: 'success',
  failed: 'error',
};

const statusText: Record<string, string> = {
  uploading: '上传中',
  parsing: '解析中',
  completed: '已完成',
  failed: '失败',
};

export default function FileManager({ files, setFiles, setGraphData, startTask, task }: Props) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      task.taskType === 'kg_build' &&
      task.status === 'completed' &&
      task.finalResult
    ) {
      setGraphData(task.finalResult);
      message.success('知识图谱构建成功');
    }
  }, [task.status, task.taskType, task.finalResult, setGraphData]);

  const handleUpload = useCallback(
    async (options: any) => {
      const { file, onSuccess, onError, onProgress } = options;
      try {
        const result = await api.uploadFile(file, (pct) => onProgress?.({ percent: pct }));
        setFiles((prev) => [...prev, result]);
        onSuccess?.(result);
        message.success(`${file.name} 上传成功`);
      } catch (err: any) {
        onError?.(err);
        message.error(`上传失败: ${err.message}`);
      }
    },
    [setFiles]
  );

  const loadMineru = useCallback(async () => {
    setLoading(true);
    try {
      const textbooks = await api.loadMineruTextbooks();
      setFiles(textbooks);
      message.success(`已加载 ${textbooks.length} 本教材`);
    } catch (err: any) {
      message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [setFiles]);

  const handleBuildKG = useCallback(
    (textbookId: string, title: string) => {
      startTask('kg_build', { textbook_id: textbookId }, title);
    },
    [startTask]
  );

  const handleViewAll = useCallback(async () => {
    try {
      const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
      if (ids.length === 0) return message.warning('没有已完成的教材');
      const graph = await api.getGraphVisualization(ids);
      setGraphData(graph);
    } catch (err: any) {
      message.error(`加载图谱失败: ${err.message}`);
    }
  }, [files, setGraphData]);

  const isBuildingKG = task.taskType === 'kg_build' && task.status === 'running';

  return (
    <div>
      <Upload.Dragger
        multiple
        accept=".pdf,.md,.txt,.docx"
        customRequest={handleUpload}
        showUploadList={false}
        className="!bg-[#252525] !border-[#404040] hover:!border-[#1677ff]"
      >
        <p className="text-gray-400">
          <CloudUploadOutlined className="text-2xl" />
        </p>
        <p className="text-xs text-gray-500 mt-1">拖拽或点击上传教材</p>
        <p className="text-xs text-gray-600">PDF / MD / TXT / DOCX</p>
      </Upload.Dragger>

      <Button
        block
        icon={<DatabaseOutlined />}
        onClick={loadMineru}
        loading={loading}
        className="mt-3"
      >
        加载 MinerU 预提取教材
      </Button>

      <Divider className="!my-3" />

      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-500">教材列表 ({files.length})</span>
        {files.length > 1 && (
          <Button type="link" size="small" onClick={handleViewAll}>
            查看全部图谱
          </Button>
        )}
      </div>

      <List
        size="small"
        dataSource={files}
        renderItem={(file) => (
          <List.Item
            className="!px-2 !py-1.5 rounded hover:bg-[#252525] cursor-pointer"
            actions={[
              file.status === 'completed' && (
                <Button
                  type="link"
                  size="small"
                  loading={isBuildingKG && task.label === (file.title || file.filename)}
                  disabled={isBuildingKG}
                  onClick={() => handleBuildKG(file.id, file.title || file.filename)}
                >
                  构建图谱
                </Button>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={
                <span className="text-sm text-gray-200">
                  {file.title || file.filename}
                </span>
              }
              description={
                <div className="flex items-center gap-2 text-xs">
                  <Tag color={statusColor[file.status]} className="text-xs">
                    {statusText[file.status]}
                  </Tag>
                  {file.chapterCount && <span className="text-gray-500">{file.chapterCount} 章</span>}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 3: 修改 IntegrationPanel — 使用 stream API**

替换整个 `IntegrationPanel/index.tsx`：

```tsx
import { useState, useEffect } from 'react';
import { Button, Input, List, Tag, Card, message, Divider, Progress } from 'antd';
import { MergeCellsOutlined, SendOutlined } from '@ant-design/icons';
import type { TextbookFile, GraphData, IntegrationStats, IntegrationDecision, ChatMessage, TaskState, TaskType } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
  setGraphData: React.Dispatch<React.SetStateAction<GraphData>>;
  setIntegrationStats: React.Dispatch<React.SetStateAction<IntegrationStats | null>>;
  startTask: (taskType: TaskType, params: Record<string, string>, label: string) => void;
  task: TaskState;
}

const actionTag: Record<string, { color: string; text: string }> = {
  merge: { color: 'gold', text: '合并' },
  keep: { color: 'green', text: '保留' },
  remove: { color: 'default', text: '删除' },
};

export default function IntegrationPanel({ files, setGraphData, setIntegrationStats, startTask, task }: Props) {
  const [decisions, setDecisions] = useState<IntegrationDecision[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);

  useEffect(() => {
    if (
      task.taskType === 'integrate' &&
      task.status === 'completed' &&
      task.finalResult
    ) {
      const result = task.finalResult;
      if (result.decisions) setDecisions(result.decisions);
      if (result.statistics) setIntegrationStats(result.statistics);
      const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
      api.getGraphVisualization(ids).then(setGraphData).catch(() => {});
      message.success('整合完成');
    }
  }, [task.status, task.taskType, task.finalResult, files, setGraphData, setIntegrationStats]);

  const handleIntegrate = () => {
    const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
    if (ids.length < 2) return message.warning('至少需要2本教材进行整合');
    startTask('integrate', { textbook_ids: ids.join(',') }, `${ids.length} 本教材`);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const result = await api.sendChatMessage(chatInput, sessionId, chatMessages);
      setChatMessages((prev) => [...prev, result]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const isIntegrating = task.taskType === 'integrate' && task.status === 'running';

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#303030]">
        <Button
          type="primary"
          block
          icon={<MergeCellsOutlined />}
          onClick={handleIntegrate}
          loading={isIntegrating}
          disabled={files.filter((f) => f.status === 'completed').length < 2 || isIntegrating}
        >
          执行跨教材整合
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {decisions.length > 0 ? (
          <List
            size="small"
            header={<span className="text-xs text-gray-500">整合决策 ({decisions.length})</span>}
            dataSource={decisions.slice(0, 50)}
            renderItem={(d) => (
              <List.Item className="!px-0">
                <Card size="small" className="w-full !bg-[#252525]">
                  <div className="flex items-start gap-2">
                    <Tag color={actionTag[d.action]?.color}>{actionTag[d.action]?.text}</Tag>
                    <div className="flex-1 text-xs">
                      <div className="text-gray-300">
                        {d.resultNode?.name || d.affectedNodes.join(', ')}
                      </div>
                      <div className="text-gray-500 mt-1">{d.reason}</div>
                      {d.confidence > 0 && (
                        <Progress
                          percent={Math.round(d.confidence * 100)}
                          size="small"
                          className="mt-1"
                          strokeColor={d.confidence > 0.9 ? '#52c41a' : '#faad14'}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <div className="text-center text-gray-500 text-xs mt-8">
            点击上方按钮执行整合后查看决策列表
          </div>
        )}

        {decisions.length > 0 && (
          <>
            <Divider className="!my-3"><span className="text-xs text-gray-500">对话调整</span></Divider>
            <div className="space-y-2 mb-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs rounded-lg px-3 py-2 ${
                    msg.role === 'user' ? 'bg-[#1677ff]/20 text-gray-200 ml-4' : 'bg-[#252525] text-gray-300 mr-4'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="text-xs bg-[#252525] rounded-lg px-3 py-2 text-gray-400 mr-4">
                  思考中...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {decisions.length > 0 && (
        <div className="p-3 border-t border-[#303030]">
          <Input
            placeholder="例如：请保留'免疫应答'，不要删除"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onPressEnter={handleChatSend}
            suffix={
              <Button type="text" icon={<SendOutlined />} onClick={handleChatSend} loading={chatLoading} size="small" />
            }
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 修改 RAGChat — 使用 stream API**

替换整个 `RAGChat/index.tsx`：

```tsx
import { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Tag, Collapse, Empty, Statistic, Row, Col } from 'antd';
import { SendOutlined, BookOutlined } from '@ant-design/icons';
import type { TextbookFile, ChatMessage, RAGCitation, TaskState, TaskType } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
  startTask: (taskType: TaskType, params: Record<string, string>, label: string) => void;
  task: TaskState;
}

export default function RAGChat({ files, startTask, task }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{ indexedBooks: number; totalChunks: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getRAGStatus().then(setIndexStatus).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (
      task.taskType === 'rag_index' &&
      task.status === 'completed' &&
      task.finalResult
    ) {
      setIndexStatus({
        indexedBooks: task.finalResult.indexed,
        totalChunks: task.finalResult.chunks,
      });
    }
  }, [task.status, task.taskType, task.finalResult]);

  const handleBuildIndex = () => {
    const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
    if (ids.length === 0) return;
    startTask('rag_index', { textbook_ids: ids.join(',') }, `${ids.length} 本教材`);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await api.queryRAG(input);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        timestamp: Date.now(),
        citations: result.citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `查询失败: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isIndexing = task.taskType === 'rag_index' && task.status === 'running';

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#303030]">
        <Row gutter={12} align="middle">
          <Col>
            <Statistic
              title={<span className="text-xs text-gray-500">已索引</span>}
              value={indexStatus?.indexedBooks || 0}
              suffix="本"
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Col>
          <Col>
            <Statistic
              title={<span className="text-xs text-gray-500">知识块</span>}
              value={indexStatus?.totalChunks || 0}
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Col>
          <Col flex="auto" className="text-right">
            <Button size="small" onClick={handleBuildIndex} loading={isIndexing} disabled={isIndexing}>
              建立索引
            </Button>
          </Col>
        </Row>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <Empty description="输入问题开始问答" className="mt-12" />
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#1677ff] text-white'
                  : 'bg-[#252525] text-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <Collapse
                  ghost
                  size="small"
                  className="mt-2"
                  items={[
                    {
                      key: 'citations',
                      label: <span className="text-xs text-gray-400"><BookOutlined /> 引用来源 ({msg.citations.length})</span>,
                      children: (
                        <div className="space-y-2">
                          {msg.citations.map((c: RAGCitation, j: number) => (
                            <Card key={j} size="small" className="!bg-[#1a1a1a]">
                              <div className="text-xs">
                                <Tag color="blue">{c.textbook}</Tag>
                                <span className="text-gray-400">{c.chapter}</span>
                                <span className="text-gray-500 ml-2">第{c.page}页</span>
                                <Tag className="ml-2" color={c.relevanceScore > 0.9 ? 'green' : 'default'}>
                                  {(c.relevanceScore * 100).toFixed(0)}%
                                </Tag>
                              </div>
                              {c.chunkContent && (
                                <div className="mt-1 text-xs text-gray-500 line-clamp-3">
                                  {c.chunkContent}
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#252525] rounded-lg px-3 py-2 text-sm text-gray-400">
              思考中...
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#303030]">
        <Input.Search
          placeholder="输入医学问题，如：什么是动作电位？"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={handleSend}
          enterButton={<Button type="primary" icon={<SendOutlined />} loading={loading}>发送</Button>}
          onPressEnter={handleSend}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 验证前端编译**

Run: `cd /data/lidubai/lidubai/hackathon/Med-KG-QA/frontend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): integrate TaskProgress into all components with SSE support"
```

---

## Task 10: 端到端验证

**Files:** 无文件改动

- [ ] **Step 1: 运行后端 E2E 测试确保无回归**

Run:
```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend
conda run -n medkg env HF_ENDPOINT=https://hf-mirror.com python test_e2e.py
```
Expected: 18/18 PASS

- [ ] **Step 2: 验证前端构建**

Run:
```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA/frontend
npm run build
```
Expected: 构建成功无错误

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify all tests pass and frontend builds successfully"
```
