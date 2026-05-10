# 实时进度显示与前端视觉升级 — 设计文档

> 日期：2026-05-10
> 状态：已确认，待实现

## 1. 问题陈述

当前系统的三个长时间操作（知识图谱构建、跨教材整合、RAG 索引构建）在处理过程中，前端仅显示按钮 loading 转圈，用户无法得知：
- 系统正在做什么
- 进行到了哪一步
- 已产出了哪些中间结果
- 预计还需多久

这些操作可能耗时数分钟到数十分钟，用户体验极差。

## 2. 设计目标

1. 为三个长时间操作提供**实时进度推送**（SSE）
2. 前端展示精确的步骤、百分比、中间结果
3. 在现有暗色主题基础上进行**视觉升级**（动画、微交互）
4. **零破坏**：原有 API 和 18 项 E2E 测试不受影响

## 3. 技术方案：SSE (Server-Sent Events)

### 3.1 选型理由

| 方案 | 实时性 | 复杂度 | 适配性 |
|------|--------|--------|--------|
| **SSE** ✓ | 毫秒级 | 中等 | FastAPI 原生支持，单向推送完美匹配场景 |
| 轮询 | 秒级延迟 | 低 | 进度跳跃感明显 |
| WebSocket | 毫秒级 | 高 | 双向通信，本场景 overkill |

原仓库 `score.py` 中已有 SSE 实现（`EventSourceResponse`），可复用模式。

## 4. 后端设计

### 4.1 新增 SSE 端点

| 新端点 | 对应原端点 | 用途 |
|--------|-----------|------|
| `GET /api/kg/build/stream?textbook_id=xxx` | `/api/kg/build` | 知识图谱构建进度流 |
| `GET /api/kg/integrate/stream?textbook_ids=a,b` | `/api/kg/integrate` | 跨教材整合进度流 |
| `GET /api/rag/index/stream?textbook_ids=a,b` | `/api/rag/index` | RAG 索引构建进度流 |

使用 GET 方法 + query params，以兼容浏览器原生 `EventSource` API。
原有 POST 端点**保留不动**，保持向后兼容。

### 4.2 SSE 事件格式

```json
{
  "event": "progress",
  "data": {
    "phase": "extracting",
    "step": "正在提取第3章: 颈部解剖",
    "current": 3,
    "total": 12,
    "percent": 25,
    "partialResult": { "nodesCount": 47, "relationsCount": 23 }
  }
}
```

**事件类型：**
- `step`：阶段切换（如 "嵌入计算" → "相似度匹配"）
- `progress`：进度更新（百分比 + 当前/总计）
- `partial`：中间结果（已提取的节点数等）
- `decision`：单条整合决策（仅整合操作）
- `complete`：任务完成，附带完整结果
- `error`：任务失败，附带错误信息

### 4.3 核心模块改造

三个核心模块新增可选 `on_progress` 回调参数：

```python
async def extract_knowledge_from_textbook(
    textbook: dict,
    on_progress: Optional[Callable] = None  # 新增，默认 None
) -> dict:
    for i, chapter in enumerate(chapters):
        if on_progress:
            await on_progress({
                "event": "progress",
                "phase": "extracting",
                "step": f"正在提取第{i+1}章: {chapter['title']}",
                "current": i + 1,
                "total": len(chapters),
                "percent": round((i + 1) / len(chapters) * 100),
            })
        # ... 原有逻辑不变
```

**关键约束：`on_progress` 默认 `None`，不传时行为和现在完全一致。**

### 4.4 改动文件

| 文件 | 改动类型 | 内容 |
|------|---------|------|
| `src/med_api.py` | 新增 3 个端点 | SSE 流式端点 |
| `src/knowledge_extract.py` | 小改 | 新增 `on_progress` 参数 |
| `src/integration.py` | 小改 | 新增 `on_progress` 参数 |
| `src/rag_pipeline.py` | 小改 | 新增 `on_progress` 参数 |

## 5. 前端设计

### 5.1 设计风格

在现有 Ant Design 暗色主题基础上融入**医学仪表盘**风格：
- 冷蓝光渐变进度条（`#1677ff` → `#52c41a`），带脉冲扫描线动画
- 步骤指示器：✓ 绿色（已完成）、● 蓝色脉冲（进行中）、○ 灰色（待处理）
- 实时数字跳动动画
- 毛玻璃悬浮面板（`backdrop-blur(12px)`）

### 5.2 核心组件：TaskProgress

底部悬浮面板，任务运行时自动展开，位于中央图谱区域底部。

```
┌─────────────────────────────────────────────────────┐
│  ⚡ 知识图谱构建 — 局部解剖学        ██████░░░░ 62%  │
│                                                      │
│  当前步骤: 正在提取第7章 / 共12章 — "上肢血管神经"    │
│  ┌─ ✓ 第1章  ─ ✓ 第2章  ─ ✓ 第3章  ─ ...         ─┐ │
│  │  ● 第7章  ─ ○ 第8章  ─ ...                       │ │
│  └──────────────────────────────────────────────────┘ │
│  已提取: 47 个知识点 · 23 条关系        耗时 2m 34s   │
│                                          [取消]       │
└─────────────────────────────────────────────────────┘
```

### 5.3 useTaskProgress Hook

管理 SSE 连接生命周期和进度状态：

```typescript
interface TaskState {
  taskType: 'kg_build' | 'integrate' | 'rag_index';
  status: 'idle' | 'running' | 'completed' | 'error';
  phase: string;
  step: string;
  current: number;
  total: number;
  percent: number;
  partialResults: any[];
  elapsed: number;
  error?: string;
}
```

功能：
- 创建 EventSource 连接到 SSE 端点
- 解析事件并更新 TaskState
- 自动计时（elapsed）
- 连接断开/错误处理
- 提供 `startTask` / `cancelTask` 方法

### 5.4 降级策略

如果 SSE 连接失败，自动 fallback 到原有非流式 API，维持基本可用性。

### 5.5 文件组织

| 文件 | 类型 | 内容 |
|------|------|------|
| `hooks/useTaskProgress.ts` | 新建 | SSE 连接 + 状态管理 |
| `components/TaskProgress/index.tsx` | 新建 | 进度面板 UI |
| `services/api.ts` | 小改 | 新增 3 个 stream API 函数 |
| `types/index.ts` | 小改 | 新增 TaskEvent / TaskState 类型 |
| `components/FileManager/index.tsx` | 小改 | 接入 stream API |
| `components/IntegrationPanel/index.tsx` | 小改 | 接入 stream API |
| `components/RAGChat/index.tsx` | 小改 | 接入 stream API |
| `App.tsx` | 小改 | 引入 TaskProgress 组件 |
| `index.css` | 小改 | 脉冲动画、进度条渐变 CSS |

### 5.6 不改动的部分

- `KnowledgeGraph/index.tsx`：纯展示组件
- `Report/index.tsx`：纯展示组件

## 6. 风险控制

1. **回调默认 None**：后端模块不传 `on_progress` 时行为不变
2. **原端点保留**：新增 `/stream` 后缀端点，原端点不动
3. **前端降级**：SSE 失败自动 fallback 到非流式 API
4. **分支开发**：`feat/realtime-progress` 分支，不影响 main
5. **测试兼容**：原有 18 项 E2E 测试全部保持通过

## 7. 不在本次范围内

- 数据持久化（KG/整合结果写入磁盘）— 后续单独处理
- 任务取消后端实现 — 前端预留取消按钮，后端暂不实现中断逻辑
- 多用户并发任务管理 — hackathon 场景单用户足够
