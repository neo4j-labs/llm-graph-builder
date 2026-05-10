# 知识点提取模块 - 快速参考卡片

## 🚀 一分钟上手

### 第一步：配置环境

编辑 `/data/lidubai/lidubai/hackathon/.env`：

```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=你的API密钥
LLM_MODEL_NAME=gpt-4o-mini
```

### 第二步：运行测试

```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA
python3 examples/test_knowledge_extract.py
```

### 第三步：查看结果

```bash
# 查看生成的 JSON 文件
cat examples/output/example_single_chapter.json | python3 -m json.tool
```

---

## 📝 最简代码示例

```python
import asyncio
from src.knowledge_extract import extract_knowledge_from_chapter

async def main():
    chapter = {
        "chapter_id": "ch_01",
        "title": "第一章 细胞",
        "content": "你的章节内容...",
        "page_start": 1,
        "page_end": 20
    }
    
    textbook_info = {
        "textbook_id": "book_01",
        "title": "生理学"
    }
    
    result = await extract_knowledge_from_chapter(chapter, textbook_info)
    
    print(f"✓ 提取了 {len(result['nodes'])} 个知识点")
    print(f"✓ 识别了 {len(result['relations'])} 个关系")

asyncio.run(main())
```

---

## 📊 输出格式速查

### 节点 (Node)

```json
{
  "id": "book_01_node_001",
  "name": "静息电位",
  "definition": "细胞在安静状态下的膜电位",
  "category": "核心概念",
  "chapter": "第一章",
  "page": 1,
  "textbook_id": "book_01",
  "textbook_title": "生理学"
}
```

### 关系 (Relation)

```json
{
  "source": "book_01_node_001",
  "target": "book_01_node_002",
  "relation_type": "prerequisite",
  "description": "理解B需要先掌握A"
}
```

---

## 🔧 核心函数

| 函数 | 用途 | 输入 | 输出 |
|------|------|------|------|
| `extract_knowledge_from_chapter()` | 提取单章节 | chapter, textbook_info | {nodes, relations} |
| `extract_knowledge_from_textbook()` | 提取整本书 | textbook | {nodes, relations, ...} |
| `save_knowledge_graph()` | 保存结果 | kg, path | None |
| `load_knowledge_graph()` | 加载结果 | path | {nodes, relations} |

---

## 🎯 知识点分类 (8种)

1. 核心概念 2. 解剖结构 3. 生理机制 4. 病理变化
5. 临床表现 6. 诊断方法 7. 治疗方案 8. 实验技术

---

## 🔗 关系类型 (6种)

| 类型 | 说明 | 符号 |
|------|------|------|
| prerequisite | 前置依赖 | A ← B |
| parallel | 并列关系 | A ∥ B |
| contains | 包含关系 | A ⊃ B |
| applies_to | 应用关系 | A → B |
| causes | 因果关系 | A ⇒ B |
| part_of | 组成关系 | A ⊂ B |

---

## ⚙️ 关键参数

```python
result = await extract_knowledge_from_chapter(
    chapter,
    textbook_info,
    llm=None,           # 自定义 LLM（可选）
    max_retries=2       # 最大重试次数
)
```

---

## 🐛 调试技巧

### 查看详细日志

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 测试 LLM 连接

```python
from src.llm import get_llm
llm, model_name, _ = get_llm("default")
print(f"✓ 已连接: {model_name}")
```

### 验证 JSON 输出

```bash
python3 -c "
import json
with open('examples/output/example_single_chapter.json', 'r') as f:
    data = json.load(f)
    print(f\"节点数: {len(data['nodes'])}\")
    print(f\"关系数: {len(data['relations'])}\")
"
```

---

## 📚 文档链接

- 📖 [完整使用文档](docs/knowledge_extract_usage.md)
- 🧪 [测试示例代码](examples/test_knowledge_extract.py)
- 🏗️ [Agent 架构说明](AGENTS.md)
- 📘 [项目 README](README_knowledge_extract.md)

---

## ⚡ 性能参考

| 指标 | 值 |
|------|------|
| 单章节耗时 | 5-15 秒 |
| 知识点/章节 | 10-20 个 |
| Token 消耗 | ~2500/章节 |
| 最大章节长度 | 无限制（自动分段） |

---

## ❓ 常见问题 FAQ

**Q: LLM 返回格式错误？**  
A: 模块内置容错，会自动提取 JSON。检查 `temperature=0`

**Q: 提取的知识点太少？**  
A: 修改 Prompt，增加数量要求（如 20-50 个）

**Q: 如何支持其他学科？**  
A: 修改 `KNOWLEDGE_CATEGORIES` 和 Few-shot 示例

**Q: API 成本太高？**  
A: 使用 gpt-4o-mini 或本地模型

---

## 📞 技术支持

遇到问题？检查以下项：

- ✅ `.env` 文件配置正确
- ✅ API Key 有效且有额度
- ✅ 网络连接正常
- ✅ Python 版本 ≥ 3.8
- ✅ 依赖包已安装

---

**版本**: v1.0 | **更新**: 2026-05-10 | **状态**: ✅ 生产就绪
