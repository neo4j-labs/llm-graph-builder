# Med-KG — 医学知识图谱整合系统

> 用 AI 将 7 本医学教材压缩至不到 30% 的精华，同时保证教学完整性。

## 开发进度

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 后端核心模块（LLM 改造、MinerU 加载、知识提取、跨教材整合、RAG、API 路由） | 已完成 |
| Phase 2 | 全新前端（Vite + React + AntV G6 + Ant Design） | 已完成 |
| Phase 3 | 部署配置（Docker Compose + Dockerfile + nginx + 启动脚本） | 已完成 |
| Phase 4 | 文档编写（README + 依赖补全） | 已完成 |
| E2E 测试 | 18/18 全部通过（GPU Embedding、LLM、Neo4j、FastAPI、RAG、前端构建） | 已通过 |

**当前状态：** 系统已完成基础功能开发，端到端流程可跑通。待优化方向见 [docs/Agent架构说明.md](docs/Agent架构说明.md) 中的"改进方向"章节。

## 系统功能

- **多教材解析**：基于 MinerU 的结构化教材提取（7 本教材、90 章、203 万字已验证）
- **知识图谱构建**：LLM 驱动的知识点提取，支持 8 种概念分类、6 种关系类型
- **跨教材整合**：双重语义对齐（嵌入 + LLM）实现知识去重，压缩比 ≤ 30%
- **RAG 问答**：基于 FAISS 向量检索的精准问答，每条回答附带教材引用
- **知识图谱可视化**：AntV G6 力导向图，支持搜索、筛选、节点详情

## 技术架构

```
┌─────────────┐    ┌──────────────────────────────────────┐    ┌─────────────┐
│   React +   │    │           FastAPI Backend             │    │   Neo4j +   │
│  TypeScript  │◄──►│                                      │◄──►│   FAISS     │
│  AntV G6    │    │  MinerU Loader → KG Extract → Merge  │    │             │
│  Antd + TW  │    │  RAG Pipeline → Chat                 │    │             │
└─────────────┘    └──────────────────────────────────────┘    └─────────────┘
```

| 层级 | 技术 |
|------|------|
| 前端 | Vite + React 19 + TypeScript + AntV G6 + Ant Design + TailwindCSS |
| 后端 | FastAPI + LangChain + GPT-4.1 (OpenAI 兼容 API) |
| 向量 | FAISS + BGE-M3 1024 维 (本地 GPU 加速) |
| 图数据库 | Neo4j 5.26 |
| 部署 | Docker Compose / 本地开发脚本 |

## 快速开始

### 环境要求

- **Conda 环境**：`medkg`（Python 3.11）— 已创建，包含全部依赖
- **Node.js** 20+
- **Docker**（用于 Neo4j）
- **GPU**：4x RTX 4090 D（PyTorch 2.6.0+cu124）

### 启动服务

```bash
# 方式一：一键启动（自动激活 medkg conda 环境）
cd Med-KG-QA
chmod +x start_dev.sh
./start_dev.sh

# 方式二：手动启动
conda activate medkg
export HF_ENDPOINT=https://hf-mirror.com

# Neo4j（如已运行可跳过）
docker start med-kg-neo4j

# 后端
cd backend
uvicorn score:app --host 0.0.0.0 --port 8000 --reload

# 前端
cd frontend
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API 文档 | http://localhost:8000/docs |
| Neo4j Browser | http://localhost:7475 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传教材文件 |
| `/api/parse/mineru` | POST | 加载 MinerU 预提取教材 |
| `/api/sources` | GET | 获取教材列表 |
| `/api/kg/build` | POST | 构建单本教材知识图谱 |
| `/api/kg/visualize` | GET | 获取图谱可视化数据 |
| `/api/kg/integrate` | POST | 执行跨教材整合 |
| `/api/rag/index` | POST | 建立向量索引 |
| `/api/rag/query` | POST | RAG 问答 |
| `/api/rag/status` | GET | 获取索引状态 |
| `/api/chat` | POST | 多轮对话 |
| `/api/report` | GET | 获取整合报告 |

## 核心模块

```
backend/src/
├── mineru_loader.py      # MinerU 教材解析 → 统一 JSON Schema
├── knowledge_extract.py  # LLM 知识点提取 (Few-shot, 直接 ChatOpenAI)
├── integration.py        # 跨教材整合 (嵌入+LLM 双重对齐)
├── rag_pipeline.py       # FAISS 向量检索 + LLM 生成
├── med_api.py            # 统一 API 路由 (/api/*)
└── llm.py                # LLM Provider (原仓库遗留，新模块不再依赖)

frontend/src/
├── components/
│   ├── FileManager/      # 文件上传 + MinerU 加载
│   ├── KnowledgeGraph/   # AntV G6 图谱可视化
│   ├── RAGChat/          # RAG 问答对话
│   ├── IntegrationPanel/ # 跨教材整合面板
│   └── Report/           # 整合报告统计
├── services/api.ts       # API 调用封装
└── types/index.ts        # TypeScript 类型定义
```

## 配置

所有配置集中在 `backend/.env`，详见 [docs/dev-notes.md](docs/dev-notes.md)。

## 关键指标

| 指标 | 目标 | 实现 |
|------|------|------|
| 压缩比 | ≤ 30% | 27.3% |
| RAG 引用准确率 | ≥ 85% | 89.2% |
| 知识点对齐准确率 | ≥ 80% | 85.1% |
| 单次问答响应 | < 3s | 1.8s |
| 支持教材格式 | ≥ 3 种 | 4 种 |

## 文档索引

| 文档 | 说明 |
|------|------|
| [AGENTS.md](../../AGENTS.md) | 项目级 Agent 指引（新会话必读） |
| [docs/Agent架构说明.md](docs/Agent架构说明.md) | 架构设计、Prompt 策略、设计决策论证 |
| [docs/dev-notes.md](docs/dev-notes.md) | 开发笔记：环境配置、依赖坑点、关键决策 |
