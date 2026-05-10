# MinerU 内容加载器使用说明

## 概述

`mineru_loader.py` 是一个用于从 MinerU 提取的教材数据中加载和解析内容的模块，它能够将 MinerU 的原始 JSON 输出转换为统一的教材结构格式。

## 功能特点

- 支持从 MinerU 提取的 `_content_list_v2.json` 和 `_content_list.json` 文件加载数据
- 自动识别章节标题（支持多种格式："第X章"、"绪论"等）
- 过滤掉封面、版权页、目录等非正文内容
- 过滤页眉、页脚等冗余内容
- 输出统一的 JSON Schema 格式
- 支持单本或批量加载教材

## 数据统计

已成功加载 **7 本医学教材**：

| 教材ID | 教材名称 | 章节数 | 总字数 | 总页数 |
|--------|---------|--------|--------|--------|
| book_01 | 局部解剖学 | 7章 | 177,628字 | 305页 |
| book_02 | 组织学与胚胎学 | 14章 | 211,656字 | 319页 |
| book_03 | 生理学 | 9章 | 459,736字 | 450页 |
| book_04 | 医学微生物学 | 26章 | 332,858字 | 386页 |
| book_05 | 病理学 | 15章 | 377,587字 | 418页 |
| book_06 | 传染病学 | 4章 | 231,241字 | 398页 |
| book_07 | 病理生理学 | 15章 | 244,661字 | 291页 |
| **总计** | **7本** | **90章** | **2,035,367字** | **2567页** |

## 输出格式

### 统一 JSON Schema

每本教材输出为如下格式：

```json
{
  "textbook_id": "book_01",
  "filename": "01_局部解剖学.pdf",
  "title": "局部解剖学",
  "total_pages": 305,
  "total_chars": 177628,
  "chapters": [
    {
      "chapter_id": "ch_01",
      "title": "绪论",
      "page_start": 20,
      "page_end": 27,
      "content": "章节全部正文内容...",
      "char_count": 5503
    }
  ]
}
```

### 字段说明

- `textbook_id`: 教材唯一标识（如 `book_01`）
- `filename`: 原始 PDF 文件名
- `title`: 教材中文名称
- `total_pages`: 总页数
- `total_chars`: 总字符数
- `chapters`: 章节列表
  - `chapter_id`: 章节 ID（如 `ch_01`）
  - `title`: 章节标题
  - `page_start`: 起始页码（1-based）
  - `page_end`: 结束页码（1-based）
  - `content`: 章节正文内容（已过滤页眉页脚）
  - `char_count`: 该章节字符数

## 使用方法

### 1. 加载单本教材

```python
from src.mineru_loader import load_single_textbook

# 加载单本教材
textbook = load_single_textbook(
    extracted_dir="/data/lidubai/lidubai/hackathon/warehouse/extracted",
    book_name="01_局部解剖学"
)

print(f"教材: {textbook['title']}")
print(f"章节数: {len(textbook['chapters'])}")
```

### 2. 加载所有教材

```python
from src.mineru_loader import load_all_textbooks

# 加载所有教材
textbooks = load_all_textbooks(
    warehouse_path="/data/lidubai/lidubai/hackathon/warehouse"
)

for tb in textbooks:
    print(f"{tb['textbook_id']}: {tb['title']} - {len(tb['chapters'])}章")
```

### 3. 保存教材数据

```python
from src.mineru_loader import save_textbook_to_json

# 保存教材数据为 JSON 文件
save_textbook_to_json(
    textbook_data=textbook,
    output_dir="./data/parsed_textbooks"
)
```

### 4. 运行测试脚本

```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend
python3 test_mineru_loader.py
```

测试脚本会：
- 加载所有教材
- 打印统计信息
- 保存所有教材数据到 `data/parsed_textbooks/` 目录
- 生成汇总信息文件 `summary.json`

## 环境配置

### 环境变量

```bash
export WAREHOUSE_PATH=/data/lidubai/lidubai/hackathon/warehouse
```

### 依赖

本模块仅依赖 Python 标准库：
- `json`
- `logging`
- `os`
- `re`
- `pathlib`
- `typing`

## 章节识别规则

### 识别的章节标题格式

- `绪论`
- `第X章 章节名称`（如 `第一章 头部`）
- `第X章`（如 `第2章 上皮组织`）

### 过滤规则

1. **跳过前 18 页**：封面、版权页、目录等
2. **过滤目录中的标题**：带 `……` 或页码的标题
3. **过滤页眉页脚**：`page_header` 和 `page_footer` 类型的内容
4. **过滤特殊章节**：思考题、参考文献、推荐阅读、索引等

### 提取的内容类型

- `title`: 章节标题（保留用于结构化）
- `paragraph`: 正文段落
- `list`: 列表内容

## 已知问题与注意事项

1. **某些教材章节不连续**：如《局部解剖学》从第三章直接跳到第六章（原教材如此）
2. **目录干扰**：通过正则表达式过滤目录中的章节标题（带页码或 `……`）
3. **标题层级**：MinerU 输出的标题几乎都是 level=1，无法依赖层级区分章节和小节
4. **字符统计**：基于 Python 字符串长度，不同于原 PDF 的字数统计

## 数据文件位置

- **输入数据**：`/data/lidubai/lidubai/hackathon/warehouse/extracted/`
- **输出数据**：`/data/lidubai/lidubai/hackathon/Med-KG-QA/backend/data/parsed_textbooks/`
- **汇总信息**：`data/parsed_textbooks/summary.json`

## 下一步使用

加载后的数据可用于：

1. **知识提取 Agent**：从章节内容中提取知识点和关系
2. **知识图谱构建**：构建单本教材的知识图谱
3. **RAG 问答系统**：将内容分块并建立向量索引
4. **跨教材整合**：识别和合并重复知识点

## 日志

加载器使用 Python logging 模块输出详细日志：

```
2026-05-10 11:00:54,214 - INFO - 开始加载教材: 01_局部解剖学
2026-05-10 11:00:54,266 - INFO - 找到章节: 绪论 (Page 19)
2026-05-10 11:00:54,266 - INFO - 找到章节: 第一章 头部 (Page 27)
2026-05-10 11:00:54,272 - INFO - 教材加载完成: 局部解剖学, 共 7 章, 177628 字
```

## 联系与反馈

如有问题或建议，请在项目中提交 Issue。
