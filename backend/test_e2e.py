"""
端到端测试：验证完整的数据流水线
MinerU 加载 → 知识提取 → 跨教材整合 → RAG 问答
"""
import asyncio
import json
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

PASS = 0
FAIL = 0
RESULTS = []

def report(name: str, success: bool, detail: str = ""):
    global PASS, FAIL
    if success:
        PASS += 1
        tag = "PASS"
    else:
        FAIL += 1
        tag = "FAIL"
    RESULTS.append((tag, name, detail))
    print(f"  [{tag}] {name}" + (f" — {detail}" if detail else ""))


async def main():
    global PASS, FAIL
    print("=" * 60)
    print("Med-KG 端到端测试")
    print("=" * 60)

    # ── Test 1: 环境变量 ──
    print("\n[Phase 1] 环境变量检查")
    for var in ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL_NAME", "NEO4J_URI", "WAREHOUSE_PATH"]:
        val = os.getenv(var)
        report(f"ENV {var}", val is not None and len(val) > 0, val[:30] + "..." if val and len(val) > 30 else str(val))

    # ── Test 2: MinerU 加载 ──
    print("\n[Phase 2] MinerU 教材加载")
    textbooks = []
    try:
        from src.mineru_loader import load_all_textbooks
        warehouse = os.getenv("WAREHOUSE_PATH", "/data/lidubai/lidubai/hackathon/warehouse")
        textbooks = load_all_textbooks(warehouse)
        report("load_all_textbooks()", len(textbooks) > 0, f"加载 {len(textbooks)} 本教材")
        
        if textbooks:
            tb0 = textbooks[0]
            report("教材结构完整性", all(k in tb0 for k in ["textbook_id", "title", "chapters"]),
                   f"title={tb0.get('title', '?')}, chapters={len(tb0.get('chapters', []))}")
            
            total_chars = sum(tb.get("total_chars", 0) for tb in textbooks)
            total_chapters = sum(len(tb.get("chapters", [])) for tb in textbooks)
            report("数据量检查", total_chars > 100000, f"{total_chapters} 章, {total_chars:,} 字")
    except Exception as e:
        report("MinerU 加载", False, f"{type(e).__name__}: {e}")
        traceback.print_exc()

    # ── Test 3: LLM 连通性 ──
    print("\n[Phase 3] LLM 连通性测试")
    try:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            base_url=os.getenv("LLM_BASE_URL"),
            api_key=os.getenv("LLM_API_KEY"),
            model=os.getenv("LLM_MODEL_NAME", "gpt-4.1-2025-04-14"),
            temperature=0,
            max_tokens=50,
        )
        resp = llm.invoke("请用一句话解释什么是知识图谱")
        report("LLM 调用", len(resp.content) > 5, resp.content[:80])
    except Exception as e:
        report("LLM 调用", False, f"{type(e).__name__}: {e}")

    # ── Test 4: 知识提取（仅取第一章前2000字） ──
    print("\n[Phase 4] 知识点提取（单章节）")
    kg_result = None
    if textbooks:
        try:
            from src.knowledge_extract import extract_knowledge_from_chapter
            tb = textbooks[0]
            ch = tb["chapters"][0] if tb.get("chapters") else None
            if ch:
                test_ch = {**ch, "content": ch["content"][:2000]}
                tb_info = {"textbook_id": tb["textbook_id"], "title": tb["title"]}
                t0 = time.time()
                kg_result = await extract_knowledge_from_chapter(test_ch, tb_info)
                elapsed = time.time() - t0
                nodes = kg_result.get("nodes", [])
                rels = kg_result.get("relations", [])
                report("知识点提取", len(nodes) > 0, f"{len(nodes)} 节点, {len(rels)} 关系, {elapsed:.1f}s")
                if nodes:
                    n0 = nodes[0]
                    report("节点结构", all(k in n0 for k in ["id", "name", "definition", "category"]),
                           f"name={n0.get('name', '?')}")
            else:
                report("知识点提取", False, "无章节数据")
        except Exception as e:
            report("知识点提取", False, f"{type(e).__name__}: {e}")
            traceback.print_exc()

    # ── Test 5: Embedding 模型 ──
    print("\n[Phase 5] Embedding 模型")
    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
    try:
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
        except ImportError:
            from langchain_community.embeddings import HuggingFaceEmbeddings
        model_name = os.getenv("EMBEDDING_MODEL", "/data/models/bge-m3")
        emb = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cuda"},
            encode_kwargs={"normalize_embeddings": True},
        )
        vec = emb.embed_query("动作电位是什么")
        report("Embedding 加载", len(vec) > 0, f"dim={len(vec)}, model={model_name}")
    except Exception as e:
        try:
            emb = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            vec = emb.embed_query("动作电位是什么")
            report("Embedding 加载 (CPU fallback)", len(vec) > 0, f"dim={len(vec)}")
        except Exception as e2:
            report("Embedding 加载", False, f"{type(e2).__name__}: {e2}")

    # ── Test 6: RAG Pipeline ──
    print("\n[Phase 6] RAG Pipeline")
    if textbooks:
        try:
            from src.rag_pipeline import build_index, query
            tb_subset = textbooks[:2]
            for tb in tb_subset:
                tb["chapters"] = tb["chapters"][:2]
            
            t0 = time.time()
            idx_result = build_index(tb_subset)
            elapsed = time.time() - t0
            report("FAISS 索引构建", idx_result["total_chunks"] > 0,
                   f"{idx_result['total_chunks']} chunks, {elapsed:.1f}s")

            t0 = time.time()
            qa_result = query("什么是炎症？")
            elapsed = time.time() - t0
            report("RAG 问答", len(qa_result.get("answer", "")) > 10,
                   f"答案长度={len(qa_result['answer'])}字, 引用={len(qa_result.get('citations', []))}, {elapsed:.1f}s")
            if qa_result.get("citations"):
                c0 = qa_result["citations"][0]
                report("引用结构", all(k in c0 for k in ["textbook", "chapter", "page"]),
                       f"来源: {c0.get('textbook', '?')} {c0.get('chapter', '?')}")
        except Exception as e:
            report("RAG Pipeline", False, f"{type(e).__name__}: {e}")
            traceback.print_exc()

    # ── Test 7: Neo4j 连接 ──
    print("\n[Phase 7] Neo4j 连接")
    try:
        from neo4j import GraphDatabase
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7690")
        driver = GraphDatabase.driver(uri, auth=("neo4j", os.getenv("NEO4J_PASSWORD", "med-kg-password")))
        with driver.session() as session:
            result = session.run("RETURN 1 AS n")
            val = result.single()["n"]
            report("Neo4j 连接", val == 1, f"uri={uri}")
        driver.close()
    except Exception as e:
        report("Neo4j 连接", False, f"{type(e).__name__}: {e}")

    # ── Test 8: FastAPI 应用加载 ──
    print("\n[Phase 8] FastAPI 应用")
    try:
        from score import app
        routes = [r.path for r in app.routes]
        api_routes = [r for r in routes if r.startswith("/api/")]
        report("FastAPI 应用加载", len(api_routes) >= 8,
               f"总路由={len(routes)}, /api/*路由={len(api_routes)}: {api_routes}")
    except Exception as e:
        report("FastAPI 应用加载", False, f"{type(e).__name__}: {e}")
        traceback.print_exc()

    # ── Test 9: 前端构建 ──
    print("\n[Phase 9] 前端构建产物")
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "index.html")
    report("前端 dist/index.html", os.path.exists(frontend_dist), frontend_dist)

    # ── Summary ──
    print("\n" + "=" * 60)
    print(f"测试结果: {PASS} PASS / {FAIL} FAIL / {PASS + FAIL} TOTAL")
    print("=" * 60)
    for tag, name, detail in RESULTS:
        if tag == "FAIL":
            print(f"  ❌ {name}: {detail}")
    
    if FAIL == 0:
        print("\n✅ 全部测试通过！")
    else:
        print(f"\n⚠️ 有 {FAIL} 项失败，请检查上方详情")
    
    return FAIL == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
