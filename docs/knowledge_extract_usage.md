# 医学知识点提取模块使用说明

## 文件位置
`/data/lidubai/lidubai/hackathon/Med-KG-QA/backend/src/knowledge_extract.py`

## 功能概述

该模块用于从医学教材章节中提取结构化的知识点和关系，支持：
- 自动识别医学概念、术语、解剖结构等
- 提取知识点之间的逻辑关系（前置依赖、包含、因果等）
- 长文本自动分段处理
- LLM 调用失败自动重试
- 异步并发处理

## 核心功能

### 1. 单章节知识点提取

```python
import asyncio
from src.knowledge_extract import extract_knowledge_from_chapter

# 准备章节数据
chapter = {
    "chapter_id": "ch_01",
    "title": "第一章 头部",
    "page_start": 1,
    "page_end": 45,
    "content": "章节正文内容...",
    "char_count": 15000
}

textbook_info = {
    "textbook_id": "book_01",
    "title": "局部解剖学"
}

# 提取知识点
result = await extract_knowledge_from_chapter(chapter, textbook_info)

# 输出格式
# {
#   "nodes": [
#     {
#       "id": "book_01_node_001",
#       "name": "颅骨",
#       "definition": "构成头颅骨架的骨骼...",
#       "category": "解剖结构",
#       "chapter": "第一章 头部",
#       "page": 1,
#       "textbook_id": "book_01",
#       "textbook_title": "局部解剖学"
#     }
#   ],
#   "relations": [
#     {
#       "source": "book_01_node_001",
#       "target": "book_01_node_002",
#       "relation_type": "contains",
#       "description": "颅骨包含脑颅和面颅两部分"
#     }
#   ]
# }
```

### 2. 整本教材知识点提取

```python
from src.knowledge_extract import extract_knowledge_from_textbook

# 准备教材数据
textbook = {
    "textbook_id": "book_01",
    "title": "局部解剖学",
    "chapters": [
        {
            "chapter_id": "ch_01",
            "title": "第一章 头部",
            "content": "...",
            "page_start": 1,
            "page_end": 45
        },
        {
            "chapter_id": "ch_02",
            "title": "第二章 颈部",
            "content": "...",
            "page_start": 46,
            "page_end": 90
        }
        # ... 更多章节
    ]
}

# 提取整本教材的知识点
result = await extract_knowledge_from_textbook(textbook)

# 输出格式：包含所有章节的知识点和关系
```

### 3. 自定义 LLM 实例

```python
from langchain_openai import ChatOpenAI
from src.knowledge_extract import extract_knowledge_from_chapter

# 创建自定义 LLM
llm = ChatOpenAI(
    api_key="your-api-key",
    base_url="https://api.openai.com/v1",
    model="gpt-4",
    temperature=0
)

# 使用自定义 LLM
result = await extract_knowledge_from_chapter(
    chapter, 
    textbook_info, 
    llm=llm
)
```

## 输出数据结构

### 节点（Node）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | str | 唯一标识符，格式：`{textbook_id}_node_{序号}` |
| name | str | 知识点名称 |
| definition | str | 知识点定义或描述 |
| category | str | 知识点分类（见下方分类列表） |
| chapter | str | 所属章节 |
| page | int | 起始页码 |
| textbook_id | str | 所属教材 ID |
| textbook_title | str | 所属教材名称 |

### 关系（Relation）

| 字段 | 类型 | 说明 |
|------|------|------|
| source | str | 源节点 ID |
| target | str | 目标节点 ID |
| relation_type | str | 关系类型（见下方类型列表） |
| description | str | 关系描述 |

## 知识点分类（Category）

- **核心概念**：学科基础概念
- **解剖结构**：解剖学结构
- **生理机制**：生理过程和机制
- **病理变化**：疾病相关改变
- **临床表现**：症状和体征
- **诊断方法**：检查和诊断手段
- **治疗方案**：治疗方法和用药
- **实验技术**：实验室技术

## 关系类型（Relation Type）

| 类型 | 说明 | 示例 |
|------|------|------|
| prerequisite | 前置依赖 - 理解A需要先掌握B | 动作电位 ← 静息电位 |
| parallel | 并列关系 - A和B是同级概念 | 脑颅 ∥ 面颅 |
| contains | 包含关系 - A包含B作为子概念 | 颅骨 ⊃ 额骨 |
| applies_to | 应用关系 - A应用于B的场景 | 手术方法 → 疾病治疗 |
| causes | 因果关系 - A导致B | 炎症 → 发热 |
| part_of | 组成关系 - A是B的组成部分 | 心室 ⊂ 心脏 |

## 环境配置

在项目根目录的 `.env` 文件中配置：

```bash
# LLM 配置
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key-here
LLM_MODEL_NAME=gpt-4o-mini
```

## 高级功能

### 1. 长文本自动分段

当章节内容超过 4000 字时，模块会自动：
1. 按段落分割内容
2. 并行提取各段知识点
3. 智能合并去重
4. 更新关系引用

使用方式：**无需特殊配置，自动触发**

### 2. 错误重试机制

LLM 调用失败时会自动重试（默认最多 2 次），可自定义：

```python
result = await extract_knowledge_from_chapter(
    chapter, 
    textbook_info,
    max_retries=3  # 最多重试 3 次
)
```

### 3. JSON 解析容错

LLM 返回非标准 JSON 时，模块会：
1. 尝试提取 JSON 代码块（```json ... ```）
2. 使用正则匹配 `{...}` 结构
3. 返回空结果而非崩溃

### 4. 保存和加载知识图谱

```python
from src.knowledge_extract import save_knowledge_graph, load_knowledge_graph

# 保存
save_knowledge_graph(result, "output/knowledge_graph.json")

# 加载
kg = load_knowledge_graph("output/knowledge_graph.json")
```

## 性能参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| MAX_CHUNK_SIZE | 4000 字 | 单次 LLM 处理的最大文本长度 |
| max_retries | 2 | 失败重试次数 |
| temperature | 0 | LLM 温度参数（0 = 稳定输出） |
| sleep_time | 1-2 秒 | 章节间延迟（避免 API 限流） |

## 日志输出

模块使用 Python logging 输出详细日志：

```python
import logging

# 配置日志级别
logging.basicConfig(level=logging.INFO)

# 日志内容包括：
# - 章节提取进度
# - LLM 调用状态
# - 节点和关系统计
# - 错误和警告信息
```

## 测试代码

模块自带测试函数：

```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend

# 运行测试
python3 -c "
import asyncio
import sys
sys.path.insert(0, 'src')
from knowledge_extract import test_extraction
asyncio.run(test_extraction())
"
```

## 集成示例

### 与 mineru_loader 配合使用

```python
import asyncio
from src.mineru_loader import parse_textbook_with_mineru  # 假设存在
from src.knowledge_extract import extract_knowledge_from_textbook

async def process_textbook(pdf_path: str):
    # 1. 解析 PDF
    textbook = await parse_textbook_with_mineru(pdf_path)
    
    # 2. 提取知识点
    knowledge_graph = await extract_knowledge_from_textbook(textbook)
    
    # 3. 保存结果
    save_knowledge_graph(
        knowledge_graph, 
        f"output/{textbook['textbook_id']}_kg.json"
    )
    
    return knowledge_graph

# 运行
asyncio.run(process_textbook("data/medical_textbook.pdf"))
```

## Prompt 工程说明

模块使用 Few-shot Prompt 策略：

1. **角色设定**：医学教材知识点提取专家
2. **任务描述**：明确输出格式和要求
3. **示例展示**：提供生理学章节的完整示例
4. **约束条件**：
   - 只提取核心知识点（10-20个）
   - 定义长度 50-150 字
   - 必须输出有效 JSON

### 自定义 Prompt

可以修改 `build_extraction_prompt()` 函数来调整提取策略：

```python
def build_extraction_prompt(chapter_title: str, chapter_content: str) -> str:
    # 自定义 Prompt 逻辑
    prompt = f"""
    你是一个{学科}教材知识点提取专家...
    
    【特殊要求】
    - 重点关注{特定类型}的知识点
    - 优先提取{优先级}内容
    
    章节内容：{chapter_content}
    """
    return prompt
```

## 常见问题

### Q1: LLM 返回的 JSON 格式错误怎么办？

**A**: 模块内置容错机制，会自动尝试提取 JSON 块。如果仍然失败：
1. 检查 `temperature=0` 是否设置
2. 尝试更换模型（如 gpt-4）
3. 查看日志中的原始响应

### Q2: 提取的知识点数量不符合预期？

**A**: 调整 Prompt 中的数量要求：
```python
# 在 build_extraction_prompt 中修改
"优先提取核心和高频出现的知识点（10-20个）"
# 改为
"提取尽可能多的知识点（20-50个）"
```

### Q3: 如何处理非医学学科的教材？

**A**: 修改以下内容：
1. `KNOWLEDGE_CATEGORIES` - 知识点分类
2. `RELATION_TYPES` - 关系类型
3. `build_extraction_prompt` - Few-shot 示例

### Q4: 如何提高提取准确率？

**A**: 
1. 使用更强的模型（如 GPT-4）
2. 增加 Few-shot 示例数量
3. 针对学科特点调整 Prompt
4. 增加 `max_retries` 次数

## 下一步开发

建议的扩展方向：

1. **实体链接**：将提取的知识点链接到医学本体库（如 UMLS）
2. **关系抽取增强**：使用关系抽取模型辅助 LLM
3. **知识去重**：跨章节的知识点去重和合并
4. **可视化**：知识图谱前端可视化（使用 AntV G6）
5. **增量更新**：支持新增章节而不重建整个图谱

## 许可证

本模块属于"学科知识整合智能体"项目的一部分。

---

**最后更新**: 2026-05-10  
**作者**: AI Assistant  
**版本**: v1.0
