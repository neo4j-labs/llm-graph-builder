# 开发笔记

> 本文件记录开发过程中的关键决策、踩坑记录和环境配置细节，供后续开发者参考。

## 1. 运行环境

### Conda 环境

```bash
# 环境名称：medkg，Python 3.11
conda activate medkg

# PyTorch 版本：必须使用 cu124 版本，因为系统 CUDA Driver 为 12.8
# pip 默认安装的 torch 2.11 需要 CUDA 13.x，会导致 torch.cuda.is_available() = False
pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cu124
pip install torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124
```

### 硬件配置

- **GPU**：4x NVIDIA GeForce RTX 4090 D (24 GB each)
- **CUDA Driver**：570.133.20 (CUDA 12.8)
- **PyTorch Runtime**：CUDA 12.4 (`torch==2.6.0+cu124`)

### 关键环境变量

启动后端前需要设置：

```bash
export HF_ENDPOINT=https://hf-mirror.com   # HuggingFace 镜像
```

`.env` 中还配置了 `TRANSFORMERS_OFFLINE=1` 和 `HF_HUB_OFFLINE=1`，确保不从 HuggingFace 下载模型。

## 2. 目录结构

```
/data/lidubai/lidubai/hackathon/           # 项目根目录
├── AGENTS.md                               # Agent 项目指引（workspace rule）
├── warehouse/                              # 教材数据仓库
│   ├── textbook/                           # 原始 PDF 教材（7 本）
│   ├── extracted/                          # MinerU 提取结果
│   │   ├── 01_局部解剖学/                  # 每本教材一个文件夹
│   │   │   ├── *_content_list_v2.json      # 结构化内容（优先使用）
│   │   │   ├── *_content_list.json         # 备用内容列表
│   │   │   └── *.md                        # Markdown 版本
│   │   └── ...
│   └── faiss_index/                        # FAISS 向量索引存储
├── Med-KG-QA/                              # 代码仓库（git 管理）
│   ├── backend/
│   │   ├── .env                            # 所有配置（LLM/Neo4j/Embedding 等）
│   │   ├── score.py                        # FastAPI 主入口
│   │   ├── test_e2e.py                     # 端到端测试脚本
│   │   ├── requirements.txt                # Python 依赖
│   │   └── src/                            # 核心模块（详见 README）
│   ├── frontend/                           # React 前端
│   │   ├── dist/                           # 构建产物
│   │   └── src/
│   ├── docs/                               # 文档
│   ├── start_dev.sh                        # 一键启动脚本
│   └── docker-compose.yml                  # Docker 部署配置
└── scripts/
    └── mineru_extract.sh                   # MinerU 教材提取脚本
```

## 3. 本地模型

### Embedding 模型

- **路径**：`/data/models/bge-m3`
- **维度**：1024
- **加载方式**：SentenceTransformer 或 HuggingFaceEmbeddings，自动尝试 GPU 再 fallback CPU
- 在 `.env` 中通过 `EMBEDDING_MODEL=/data/models/bge-m3` 配置

### LLM

- **模型**：`gpt-4.1-2025-04-14`（通过 OpenAI 兼容 API）
- **Base URL**：`https://kfcv50.link/v1`
- **配置位置**：`backend/.env` 中的 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL_NAME`

## 4. 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 Vite Dev | 3000 | 开发模式，proxy /api → 8765 |
| 后端 FastAPI | 8765 | `uvicorn score:app` |
| Neo4j Bolt | 7690 | 映射自容器 7687 |
| Neo4j Browser | 7475 | 映射自容器 7474 |

## 5. 踩坑记录

### PyTorch + CUDA 版本不匹配

**现象**：`torch.cuda.is_available()` 返回 False，报 "NVIDIA driver on your system is too old"  
**原因**：`requirements.txt` 里的 `torch` 被 pip 安装为最新版（需要 CUDA 13.x），但系统只有 CUDA 12.8  
**解决**：强制安装 `torch==2.6.0+cu124`  
**注意**：每次运行 `pip install -r requirements.txt` 后，都需要重新安装 cu124 版本的 torch

### Protobuf 冲突

**现象**：`TypeError: Couldn't build proto file into descriptor pool: duplicate file name google/api/field_behavior.proto`  
**原因**：`src/llm.py` 导入了 `langchain_fireworks`，它与 `google-cloud-*` 包的 protobuf 定义冲突  
**解决**：`knowledge_extract.py` 不再 `from src.llm import get_llm`，改为直接用 `ChatOpenAI` + 环境变量创建 LLM 实例。其他新模块（`rag_pipeline.py`、`integration.py`）也是独立创建 LLM，不依赖 `src.llm`

### score.py 的 import 链

**注意**：`score.py` 是原仓库的入口，它的 import 链非常深（`graphDB_dataAccess` → `gcs_bucket` → PyPDF2 → ... 一路拉到 datasets、unstructured 等大包）。所有依赖必须安装齐全，否则后端无法启动。`requirements.txt` 已包含全部依赖。

### Neo4j Docker 容器

```bash
# 容器名：med-kg-neo4j
# 如果容器已存在但未运行：
docker start med-kg-neo4j

# 如果需要重建：
docker rm -f med-kg-neo4j
docker run -d --name med-kg-neo4j \
  -p 7475:7474 -p 7690:7687 \
  -e NEO4J_AUTH=neo4j/med-kg-password \
  -e NEO4J_PLUGINS='["apoc"]' \
  neo4j:5.26.0-community
```

## 6. 新建模块 vs 原仓库模块

本项目 fork 自 [Med-KG-QA](https://github.com/somewordstoolate/Med-KG-QA)，以下模块是**新增**的：

| 模块 | 用途 | 备注 |
|------|------|------|
| `src/mineru_loader.py` | 加载 MinerU 提取的教材数据 | 替代原仓库的文件上传解析流程 |
| `src/knowledge_extract.py` | LLM 知识点提取 | 全新实现，Few-shot + 长文本分段 |
| `src/integration.py` | 跨教材整合 | 全新实现，嵌入+LLM 双重对齐 |
| `src/rag_pipeline.py` | RAG 问答 | 全新实现，FAISS + 引用溯源 |
| `src/med_api.py` | 统一 API 路由 | 前端消费的 `/api/*` 端点 |
| `test_e2e.py` | 端到端测试 | 覆盖全流程 9 个阶段 18 项检查 |
| `frontend/` | 全新前端 | Vite + React + AntV G6 |
| `start_dev.sh` | 开发启动脚本 | 自动激活 medkg 环境 |

原仓库模块（`src/llm.py`、`src/graphDB_dataAccess.py`、`src/communities.py` 等）**保留但新模块不依赖它们**。`score.py` 同时注册了原仓库路由和新的 `med_api` 路由。

## 7. 端到端测试

```bash
conda activate medkg
export HF_ENDPOINT=https://hf-mirror.com
cd Med-KG-QA/backend
python test_e2e.py
```

测试覆盖 9 个阶段：环境变量 → MinerU 加载 → LLM 连通 → 知识点提取 → Embedding → RAG → Neo4j → FastAPI → 前端构建产物。预期结果：18 PASS / 0 FAIL。

## 8. Phase 5 新增功能踩坑记录（2026-05-10）

### 前端 `.env` 与 Vite Proxy 冲突

**现象**：浏览器报 "Network Error"，API 请求全部失败  
**原因**：`frontend/.env` 中 `VITE_API_BASE_URL=http://localhost:8000` 让浏览器直连后端端口。通过 SSH 远程访问时，浏览器只能访问转发的 3000 端口，无法直连 8765。Vite 环境变量优先级高于代码中的默认值。  
**解决**：`frontend/.env` 中 `VITE_API_BASE_URL=`（留空），所有 `/api/*` 请求走相对路径，由 Vite proxy 在服务端转发到后端 8765。  
**教训**：前端 `.env` 被 `.gitignore` 忽略了，搜索代码时容易遗漏。排查网络问题时记得 `curl http://localhost:3000/src/services/api.ts` 查看 Vite 注入的实际环境变量值。

### 上传文件未注册到内存

**现象**：上传 .txt 文件后点击"构建图谱"，SSE 连接立即断开  
**原因**：`/api/upload` 端点只把文件保存到磁盘，没有将教材数据注册到 `_textbooks` 字典。SSE 端点 `_textbooks.get(textbook_id)` 返回 None → 404 → EventSource 触发 onerror  
**解决**：upload 端点现在会解析文件内容并注册到 `_textbooks`（作为单章处理）

### SSE 端点必须用 GET 方法

**现象**：前端 EventSource 无法连接 POST 类型的 SSE 端点  
**原因**：浏览器原生 `EventSource` API 只支持 GET 请求  
**解决**：SSE 端点统一用 `GET` 方法 + query params。原有 POST 端点保留不动，保持向后兼容。

### npm run build 会终止 dev server

**现象**：运行 `npm run build` 验证前端后，刷新浏览器发现 3000 端口无响应  
**原因**：在同一个 shell 进程中 `npm run build` 可能影响 dev server 的 node 进程  
**解决**：验证前端构建时用独立的 shell 进程，不要在 dev server 运行的终端中执行

### KG 缓存持久化

**机制**：KG 构建完成后自动保存到 `warehouse/kg_cache/{textbook_id}.json`。加载教材时自动扫描缓存目录，标记已有缓存的教材。SSE 端点命中缓存时直接返回，不调用 LLM。  
**缓存位置**：`/data/lidubai/lidubai/hackathon/warehouse/kg_cache/`  
**清除缓存**：删除对应 JSON 文件即可强制重新构建
