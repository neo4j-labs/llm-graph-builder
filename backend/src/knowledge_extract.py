"""
医学知识点提取模块

从教材章节中提取知识点（概念、定理、方法等）及其关系，构建医学知识图谱。
支持异步处理、错误重试、长文本分段等功能。
"""

import logging
import json
import os
import re
import asyncio
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# 知识点分类
KNOWLEDGE_CATEGORIES = [
    "核心概念",      # 学科基础概念
    "解剖结构",      # 解剖学结构
    "生理机制",      # 生理过程和机制
    "病理变化",      # 疾病相关改变
    "临床表现",      # 症状和体征
    "诊断方法",      # 检查和诊断手段
    "治疗方案",      # 治疗方法和用药
    "实验技术",      # 实验室技术
]

# 关系类型定义
RELATION_TYPES = {
    "prerequisite": "前置依赖 - 理解A需要先掌握B",
    "parallel": "并列关系 - A和B是同级概念",
    "contains": "包含关系 - A包含B作为子概念",
    "applies_to": "应用关系 - A应用于B的场景",
    "causes": "因果关系 - A导致B",
    "part_of": "组成关系 - A是B的组成部分",
}

# 每次处理的最大字符数
MAX_CHUNK_SIZE = 4000


def build_extraction_prompt(chapter_title: str, chapter_content: str) -> str:
    """
    构建知识点提取的 Prompt
    
    Args:
        chapter_title: 章节标题
        chapter_content: 章节正文内容
    
    Returns:
        str: 完整的 Prompt 文本
    """
    
    # Few-shot 示例
    few_shot_example = """
【示例】
章节：第二章 细胞的基本功能 - 细胞的兴奋性和生物电现象

输出：
{
  "nodes": [
    {
      "name": "静息电位",
      "definition": "细胞在安静状态下，膜内外存在的电位差，通常膜内为负，膜外为正",
      "category": "核心概念"
    },
    {
      "name": "动作电位",
      "definition": "可兴奋细胞受到刺激后，膜电位发生的一次快速而可逆的倒转和恢复过程",
      "category": "生理机制"
    },
    {
      "name": "钠钾泵",
      "definition": "主动转运蛋白,消耗ATP将3个Na+泵出细胞,同时将2个K+泵入细胞,维持静息电位",
      "category": "核心概念"
    },
    {
      "name": "去极化",
      "definition": "膜电位向0方向变化或超过0mV的过程,膜内电位变得更正",
      "category": "生理机制"
    }
  ],
  "relations": [
    {
      "source": "静息电位",
      "target": "动作电位",
      "relation_type": "prerequisite",
      "description": "理解动作电位的产生和变化需要先掌握静息电位的概念"
    },
    {
      "source": "钠钾泵",
      "target": "静息电位",
      "relation_type": "causes",
      "description": "钠钾泵的主动转运活动是形成和维持静息电位的重要基础"
    },
    {
      "source": "去极化",
      "target": "动作电位",
      "relation_type": "part_of",
      "description": "去极化是动作电位上升支的核心过程"
    }
  ]
}
"""
    
    prompt = f"""你是一位经验丰富的医学教材知识点提取专家。你的任务是从给定的医学教材章节中提取核心知识点及其之间的关系。

【任务要求】
1. 识别章节中的核心知识点，包括：
   - 重要概念、术语
   - 解剖结构及其特点
   - 生理或病理机制
   - 诊断和治疗方法
   - 实验技术

2. 为每个知识点提供：
   - name: 知识点名称（简洁准确）
   - definition: 清晰的定义或描述（50-150字）
   - category: 分类（从以下选择：{', '.join(KNOWLEDGE_CATEGORIES)}）

3. 识别知识点之间的关系，类型包括：
   {chr(10).join(f'   - {k}: {v}' for k, v in RELATION_TYPES.items())}

4. 输出必须是有效的 JSON 格式，包含 nodes 和 relations 两个数组

【注意事项】
- 只提取该章节特有的知识点，避免过于通用的内容
- definition 要准确完整，包含关键特征
- relations 要体现知识点之间的逻辑关系
- 如果内容较多，优先提取核心和高频出现的知识点（10-20个）

{few_shot_example}

【当前章节】
章节标题：{chapter_title}

章节内容：
{chapter_content[:MAX_CHUNK_SIZE]}

请提取该章节的知识点和关系，输出 JSON 格式：
"""
    
    return prompt


def parse_llm_response(
    response: str, 
    textbook_id: str, 
    chapter_title: str, 
    page_start: int
) -> Dict[str, List]:
    """
    解析 LLM 返回的 JSON 响应
    
    Args:
        response: LLM 返回的原始文本
        textbook_id: 教材 ID
        chapter_title: 章节标题
        page_start: 起始页码
    
    Returns:
        dict: 包含 nodes 和 relations 的字典
    """
    try:
        # 尝试直接解析 JSON
        data = json.loads(response)
    except json.JSONDecodeError:
        # 如果失败，尝试提取 JSON 部分
        logger.warning("Response is not valid JSON, attempting to extract JSON block")
        
        # 匹配 ```json ... ``` 或直接的 {...}
        json_patterns = [
            r'```json\s*(\{.*?\})\s*```',
            r'```\s*(\{.*?\})\s*```',
            r'(\{.*\})',
        ]
        
        for pattern in json_patterns:
            match = re.search(pattern, response, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(1))
                    logger.info("Successfully extracted JSON from response")
                    break
                except json.JSONDecodeError:
                    continue
        else:
            logger.error(f"Failed to parse JSON from response: {response[:200]}...")
            return {"nodes": [], "relations": []}
    
    # 验证数据结构
    if not isinstance(data, dict):
        logger.error("Parsed data is not a dictionary")
        return {"nodes": [], "relations": []}
    
    nodes = data.get("nodes", [])
    relations = data.get("relations", [])
    
    if not isinstance(nodes, list):
        logger.error("nodes is not a list")
        nodes = []
    
    if not isinstance(relations, list):
        logger.error("relations is not a list")
        relations = []
    
    # 为每个节点添加唯一 ID 和元数据
    node_counter = 0
    processed_nodes = []
    node_name_to_id = {}
    
    for node in nodes:
        if not isinstance(node, dict):
            continue
        
        name = node.get("name", "")
        if not name:
            continue
        
        node_counter += 1
        node_id = f"{textbook_id}_node_{node_counter:03d}"
        
        processed_node = {
            "id": node_id,
            "name": name,
            "definition": node.get("definition", ""),
            "category": node.get("category", "核心概念"),
            "chapter": chapter_title,
            "page": page_start,
            "textbook_id": textbook_id,
        }
        
        processed_nodes.append(processed_node)
        node_name_to_id[name] = node_id
    
    # 处理关系，将节点名称转换为节点 ID
    processed_relations = []
    for relation in relations:
        if not isinstance(relation, dict):
            continue
        
        source_name = relation.get("source", "")
        target_name = relation.get("target", "")
        
        # 跳过无效的关系
        if not source_name or not target_name:
            continue
        
        # 查找对应的节点 ID
        source_id = node_name_to_id.get(source_name)
        target_id = node_name_to_id.get(target_name)
        
        if not source_id or not target_id:
            logger.warning(f"Relation references unknown nodes: {source_name} -> {target_name}")
            continue
        
        processed_relation = {
            "source": source_id,
            "target": target_id,
            "relation_type": relation.get("relation_type", "related"),
            "description": relation.get("description", ""),
        }
        
        processed_relations.append(processed_relation)
    
    logger.info(f"Parsed {len(processed_nodes)} nodes and {len(processed_relations)} relations")
    
    return {
        "nodes": processed_nodes,
        "relations": processed_relations
    }


async def extract_knowledge_from_chapter(
    chapter: Dict[str, Any],
    textbook_info: Dict[str, str],
    llm: Optional[ChatOpenAI] = None,
    max_retries: int = 2
) -> Dict[str, List]:
    """
    从单个章节提取知识点
    
    Args:
        chapter: 章节信息字典，包含 chapter_id, title, content, page_start 等
        textbook_info: 教材信息，包含 textbook_id, title
        llm: LLM 实例（如果为 None，会自动创建）
        max_retries: 最大重试次数
    
    Returns:
        dict: 包含 nodes 和 relations 的字典
    """
    chapter_id = chapter.get("chapter_id", "unknown")
    chapter_title = chapter.get("title", "未命名章节")
    chapter_content = chapter.get("content", "")
    page_start = chapter.get("page_start", 1)
    textbook_id = textbook_info.get("textbook_id", "unknown")
    textbook_title = textbook_info.get("title", "未命名教材")
    
    logger.info(f"开始提取章节知识点: {chapter_title} (ID: {chapter_id})")
    
    if not chapter_content:
        logger.warning(f"章节 {chapter_id} 内容为空，跳过")
        return {"nodes": [], "relations": []}
    
    # 如果内容过长，进行分段处理
    if len(chapter_content) > MAX_CHUNK_SIZE:
        logger.info(f"章节内容较长 ({len(chapter_content)} 字)，进行分段提取")
        return await extract_knowledge_from_long_chapter(
            chapter, textbook_info, llm, max_retries
        )
    
    # 创建 LLM 实例（如果未提供）
    if llm is None:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            base_url=os.getenv("LLM_BASE_URL"),
            api_key=os.getenv("LLM_API_KEY"),
            model=os.getenv("LLM_MODEL_NAME", "gpt-4.1-2025-04-14"),
            temperature=0,
        )
        logger.info(f"创建 LLM 实例: {os.getenv('LLM_MODEL_NAME')}")
    
    # 构建 Prompt
    prompt = build_extraction_prompt(chapter_title, chapter_content)
    
    # 重试机制
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"调用 LLM 提取知识点 (尝试 {attempt + 1}/{max_retries + 1})")
            
            # 调用 LLM
            messages = [
                SystemMessage(content="你是一个医学教材知识点提取专家。请严格按照 JSON 格式输出。"),
                HumanMessage(content=prompt)
            ]
            
            response = await llm.ainvoke(messages)
            response_text = response.content
            
            # 解析响应
            result = parse_llm_response(
                response_text,
                textbook_id,
                chapter_title,
                page_start
            )
            
            # 为每个节点添加教材标题
            for node in result["nodes"]:
                node["textbook_title"] = textbook_title
            
            if result["nodes"]:
                logger.info(f"成功提取 {len(result['nodes'])} 个知识点，{len(result['relations'])} 个关系")
                return result
            else:
                logger.warning(f"未提取到知识点，尝试重试")
                if attempt < max_retries:
                    await asyncio.sleep(2)  # 等待 2 秒后重试
                    continue
                else:
                    return {"nodes": [], "relations": []}
        
        except Exception as e:
            logger.error(f"提取知识点时出错 (尝试 {attempt + 1}/{max_retries + 1}): {str(e)}")
            if attempt < max_retries:
                await asyncio.sleep(2)
                continue
            else:
                return {"nodes": [], "relations": []}
    
    return {"nodes": [], "relations": []}


async def extract_knowledge_from_long_chapter(
    chapter: Dict[str, Any],
    textbook_info: Dict[str, str],
    llm: Optional[ChatOpenAI] = None,
    max_retries: int = 2
) -> Dict[str, List]:
    """
    处理超长章节：分段提取后合并
    
    Args:
        chapter: 章节信息
        textbook_info: 教材信息
        llm: LLM 实例
        max_retries: 重试次数
    
    Returns:
        dict: 合并后的知识点和关系
    """
    content = chapter.get("content", "")
    
    # 按段落分割（避免截断句子）
    paragraphs = content.split('\n\n')
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) > MAX_CHUNK_SIZE:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = para
        else:
            current_chunk += "\n\n" + para if current_chunk else para
    
    if current_chunk:
        chunks.append(current_chunk)
    
    logger.info(f"将章节分为 {len(chunks)} 段进行提取")
    
    # 并行提取各段
    tasks = []
    for i, chunk in enumerate(chunks):
        chunk_chapter = chapter.copy()
        chunk_chapter["content"] = chunk
        chunk_chapter["chapter_id"] = f"{chapter['chapter_id']}_part{i+1}"
        tasks.append(extract_knowledge_from_chapter(chunk_chapter, textbook_info, llm, max_retries))
    
    results = await asyncio.gather(*tasks)
    
    # 合并结果
    all_nodes = []
    all_relations = []
    
    for result in results:
        all_nodes.extend(result.get("nodes", []))
        all_relations.extend(result.get("relations", []))
    
    # 去重节点（基于名称）
    unique_nodes = {}
    for node in all_nodes:
        name = node["name"]
        if name not in unique_nodes:
            unique_nodes[name] = node
        else:
            # 保留定义更长的版本
            if len(node.get("definition", "")) > len(unique_nodes[name].get("definition", "")):
                unique_nodes[name] = node
    
    final_nodes = list(unique_nodes.values())
    
    # 更新关系中的节点 ID
    name_to_id = {node["name"]: node["id"] for node in final_nodes}
    valid_relations = []
    
    for rel in all_relations:
        # 这里的 source 和 target 可能是旧 ID，需要根据名称重新映射
        # 但由于我们已经按照节点名称去重，直接保留有效关系即可
        if rel["source"] in [n["id"] for n in final_nodes] and rel["target"] in [n["id"] for n in final_nodes]:
            valid_relations.append(rel)
    
    logger.info(f"合并后共 {len(final_nodes)} 个知识点，{len(valid_relations)} 个关系")
    
    return {
        "nodes": final_nodes,
        "relations": valid_relations
    }


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
        on_progress: 可选的异步进度回调函数，接收进度事件字典
    
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
    
    # 创建 LLM 实例（如果未提供）
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
    
    # 逐章节提取（避免并发过多导致 API 限流）
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
        
        # 避免 API 限流
        if i < len(chapters) - 1:
            await asyncio.sleep(1)
    
    logger.info(f"教材 {textbook_title} 提取完成：{len(all_nodes)} 个知识点，{len(all_relations)} 个关系")
    
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
    
    return {
        "nodes": all_nodes,
        "relations": all_relations,
        "textbook_id": textbook_id,
        "textbook_title": textbook_title,
        "chapter_count": len(chapters)
    }


# ============ 辅助函数 ============

def save_knowledge_graph(knowledge_graph: Dict, output_path: str):
    """保存知识图谱到 JSON 文件"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(knowledge_graph, f, ensure_ascii=False, indent=2)
        logger.info(f"知识图谱已保存到: {output_path}")
    except Exception as e:
        logger.error(f"保存知识图谱失败: {str(e)}")


def load_knowledge_graph(input_path: str) -> Dict:
    """从 JSON 文件加载知识图谱"""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            knowledge_graph = json.load(f)
        logger.info(f"已加载知识图谱: {input_path}")
        return knowledge_graph
    except Exception as e:
        logger.error(f"加载知识图谱失败: {str(e)}")
        return {"nodes": [], "relations": []}


# ============ 测试代码 ============

async def test_extraction():
    """测试知识点提取功能"""
    
    # 模拟章节数据
    test_chapter = {
        "chapter_id": "ch_01",
        "title": "第一章 头部 - 颅",
        "page_start": 1,
        "page_end": 45,
        "content": """
        颅（cranium）由脑颅和面颅组成。脑颅容纳并保护脑，面颅构成面部的支架。
        
        一、脑颅
        脑颅由8块颅骨组成，包括：
        1. 额骨（frontal bone）：构成颅前部和颅顶前部
        2. 顶骨（parietal bone）：左右各一块，构成颅顶和颅侧壁的大部分
        3. 颞骨（temporal bone）：左右各一块，位于颅底和颅侧壁的下部
        4. 枕骨（occipital bone）：构成颅后部和颅底后部
        5. 蝶骨（sphenoid bone）：位于颅底中部
        6. 筛骨（ethmoid bone）：位于颅前窝中部
        
        颅骨之间通过缝连接，主要的颅缝包括：
        - 冠状缝：额骨与两侧顶骨之间
        - 矢状缝：两侧顶骨之间
        - 人字缝：枕骨与两侧顶骨之间
        
        颅腔是脑颅内部的空腔，容纳脑及其被膜。颅腔底部不平，分为前颅窝、中颅窝和后颅窝。
        
        二、面颅
        面颅由15块颅骨组成，包括成对的上颌骨、颧骨、鼻骨、泪骨、下鼻甲、腭骨，
        以及不成对的犁骨、下颌骨和舌骨。
        
        上颌骨（maxilla）：构成面部中份的主要骨骼，参与构成眼眶、鼻腔和口腔的壁。
        """,
        "char_count": 450
    }
    
    test_textbook_info = {
        "textbook_id": "book_01",
        "title": "局部解剖学"
    }
    
    logger.info("开始测试知识点提取...")
    
    # 提取知识点
    result = await extract_knowledge_from_chapter(test_chapter, test_textbook_info)
    
    # 打印结果
    print("\n" + "="*50)
    print("提取的知识点：")
    print("="*50)
    for i, node in enumerate(result["nodes"], 1):
        print(f"\n{i}. {node['name']} ({node['category']})")
        print(f"   定义：{node['definition']}")
        print(f"   ID：{node['id']}")
    
    print("\n" + "="*50)
    print("知识点关系：")
    print("="*50)
    for i, rel in enumerate(result["relations"], 1):
        print(f"\n{i}. [{rel['relation_type']}] {rel['source']} → {rel['target']}")
        print(f"   描述：{rel['description']}")
    
    # 保存结果
    save_knowledge_graph(result, "/tmp/test_knowledge_graph.json")
    
    logger.info("测试完成")


if __name__ == "__main__":
    # 运行测试
    asyncio.run(test_extraction())
