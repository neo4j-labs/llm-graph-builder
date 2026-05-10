"""
MinerU 内容加载器模块

负责从 MinerU 提取的教材数据中加载和解析内容，输出统一的 JSON Schema
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# 7本教材的映射关系
TEXTBOOK_MAPPING = {
    "01_局部解剖学": "局部解剖学",
    "02_组织学与胚胎学": "组织学与胚胎学",
    "03_生理学": "生理学",
    "04_医学微生物学": "医学微生物学",
    "05_病理学": "病理学",
    "06_传染病学": "传染病学",
    "07_病理生理学": "病理生理学"
}


def is_chapter_title(title: str) -> bool:
    """
    判断是否为章节标题（而非节标题或其他）
    
    章节标题格式：
    - "绪论"
    - "第X章 章节名称"
    - "第X章"（不带空格和名称）
    - 排除："第X节"、"一、"、"（一）"等小节标题
    - 排除：目录中的章节（带 "……" 和页码）
    
    Args:
        title: 标题文本
        
    Returns:
        是否为章节标题
    """
    title = title.strip()
    
    # 排除目录中的章节标题（带 "……" 或 "..." 和页码）
    if '……' in title or '...' in title:
        return False
    
    # 排除带页码的标题（如 "第一章 头部 9"）
    if re.search(r'\s+\d+\s*$', title):
        return False
    
    # 匹配"第X章"格式（可能带或不带空格和名称）
    # 支持数字和中文数字
    if re.match(r'^第[\d一二三四五六七八九十百]+章', title):
        return True
    
    # 匹配"绪论"
    if title == "绪论":
        return True
    
    # 排除节标题
    if re.match(r'^第[一二三四五六七八九十百]+节', title):
        return False
    
    # 排除"一、"、"（一）"等小节标题
    if re.match(r'^[一二三四五六七八九十]+[、．]', title):
        return False
    
    if re.match(r'^[（(][一二三四五六七八九十]+[)）]', title):
        return False
    
    return False


def should_skip_page_content(page_idx: int, title: str) -> bool:
    """
    判断是否应该跳过某页或某标题的内容
    
    跳过：
    - 前18页（封面、版权页、目录等）
    - "思考题"、"参考文献"、"推荐阅读"、"索引"等
    
    Args:
        page_idx: 页码（从0开始）
        title: 标题文本
        
    Returns:
        是否应该跳过
    """
    # 跳过前18页（通常是封面、版权、目录）
    if page_idx < 18:
        return True
    
    # 跳过特定标题
    skip_keywords = [
        "思考题", "参考文献", "推荐阅读", "索引", 
        "中英文名词对照", "编委", "序言", "前言",
        "获取数字资源", "读者信息反馈"
    ]
    
    for keyword in skip_keywords:
        if keyword in title:
            return True
    
    return False


def extract_chapters_from_v2(
    content_list_v2: List[List[Dict]],
    content_list: List[Dict]
) -> List[Dict]:
    """
    从 content_list_v2 和 content_list 中提取章节信息
    
    Args:
        content_list_v2: 按页分组的结构化内容列表
        content_list: 扁平内容列表（有 page_idx）
        
    Returns:
        章节列表，每个章节包含：
        {
            "chapter_id": "ch_01",
            "title": "第一章 头部",
            "page_start": 27,
            "page_end": 37,
            "content": "章节全部正文内容...",
            "char_count": 15000
        }
    """
    chapters = []
    chapter_titles_with_pages = []
    
    # 第一步：从 content_list_v2 中找到所有章节标题及其页码
    logger.info("正在提取章节标题...")
    for page_idx, page_blocks in enumerate(content_list_v2):
        for block in page_blocks:
            if block['type'] == 'title':
                # 提取标题文本
                title_parts = block['content'].get('title_content', [])
                title = ''.join([
                    item['content'] 
                    for item in title_parts 
                    if item.get('type') == 'text'
                ]).strip()
                
                # 检查是否为章节标题
                if is_chapter_title(title) and not should_skip_page_content(page_idx, title):
                    chapter_titles_with_pages.append({
                        'title': title,
                        'page_idx': page_idx
                    })
                    logger.info(f"找到章节: {title} (Page {page_idx})")
    
    # 第二步：确定每章的起止页码
    for i, chapter_info in enumerate(chapter_titles_with_pages):
        chapter_title = chapter_info['title']
        page_start = chapter_info['page_idx']
        
        # 结束页码为下一章的起始页码-1，或者最后一页
        if i < len(chapter_titles_with_pages) - 1:
            page_end = chapter_titles_with_pages[i + 1]['page_idx'] - 1
        else:
            page_end = len(content_list_v2) - 1
        
        # 第三步：拼接该章节的所有正文内容
        chapter_content = extract_chapter_content(
            content_list_v2, 
            page_start, 
            page_end
        )
        
        # 创建章节对象
        chapter = {
            "chapter_id": f"ch_{i+1:02d}",
            "title": chapter_title,
            "page_start": page_start + 1,  # 转换为1-based页码
            "page_end": page_end + 1,
            "content": chapter_content,
            "char_count": len(chapter_content)
        }
        
        chapters.append(chapter)
        logger.info(f"提取章节: {chapter_title}, 页码: {page_start+1}-{page_end+1}, 字数: {len(chapter_content)}")
    
    return chapters


def extract_chapter_content(
    content_list_v2: List[List[Dict]],
    page_start: int,
    page_end: int
) -> str:
    """
    提取指定页码范围内的所有正文内容
    
    Args:
        content_list_v2: 按页分组的结构化内容列表
        page_start: 起始页码（0-based）
        page_end: 结束页码（0-based，包含）
        
    Returns:
        拼接后的章节正文
    """
    content_parts = []
    
    for page_idx in range(page_start, min(page_end + 1, len(content_list_v2))):
        page_blocks = content_list_v2[page_idx]
        
        for block in page_blocks:
            block_type = block['type']
            
            # 只提取 paragraph 和 list 类型的内容
            if block_type == 'paragraph':
                paragraph_parts = block['content'].get('paragraph_content', [])
                text = ''.join([
                    item['content']
                    for item in paragraph_parts
                    if item.get('type') == 'text'
                ])
                if text.strip():
                    content_parts.append(text.strip())
            
            elif block_type == 'list':
                list_parts = block['content'].get('list_content', [])
                text = ''.join([
                    item['content']
                    for item in list_parts
                    if item.get('type') == 'text'
                ])
                if text.strip():
                    content_parts.append(text.strip())
            
            # 也包含 title，但排除 page_header 和 page_footer
            elif block_type == 'title':
                title_parts = block['content'].get('title_content', [])
                text = ''.join([
                    item['content']
                    for item in title_parts
                    if item.get('type') == 'text'
                ])
                if text.strip():
                    content_parts.append(f"\n{text.strip()}\n")
    
    # 用换行符连接
    return '\n'.join(content_parts)


def load_single_textbook(extracted_dir: str, book_name: str) -> Dict:
    """
    加载单本教材，返回统一的 JSON Schema
    
    Args:
        extracted_dir: warehouse/extracted 目录路径
        book_name: 教材名称（如 "01_局部解剖学"）
        
    Returns:
        统一格式的教材字典：
        {
            "textbook_id": "book_01",
            "filename": "01_局部解剖学.pdf",
            "title": "局部解剖学",
            "total_pages": 280,
            "total_chars": 385000,
            "chapters": [...]
        }
    """
    logger.info(f"开始加载教材: {book_name}")
    
    # 构建文件路径
    book_dir = Path(extracted_dir) / book_name / "hybrid_auto"
    v2_path = book_dir / f"{book_name}_content_list_v2.json"
    v1_path = book_dir / f"{book_name}_content_list.json"
    
    if not v2_path.exists():
        raise FileNotFoundError(f"未找到文件: {v2_path}")
    
    if not v1_path.exists():
        raise FileNotFoundError(f"未找到文件: {v1_path}")
    
    # 加载 JSON 数据
    logger.info(f"加载 {v2_path.name}")
    with open(v2_path, 'r', encoding='utf-8') as f:
        content_list_v2 = json.load(f)
    
    logger.info(f"加载 {v1_path.name}")
    with open(v1_path, 'r', encoding='utf-8') as f:
        content_list = json.load(f)
    
    # 提取章节
    chapters = extract_chapters_from_v2(content_list_v2, content_list)
    
    # 计算总字数
    total_chars = sum(ch['char_count'] for ch in chapters)
    
    # 提取教材 ID（如 "01"）
    textbook_id = book_name.split('_')[0]
    
    # 构建返回结果
    result = {
        "textbook_id": f"book_{textbook_id}",
        "filename": f"{book_name}.pdf",
        "title": TEXTBOOK_MAPPING.get(book_name, book_name),
        "total_pages": len(content_list_v2),
        "total_chars": total_chars,
        "chapters": chapters
    }
    
    logger.info(f"教材加载完成: {result['title']}, 共 {len(chapters)} 章, {total_chars} 字")
    return result


def load_all_textbooks(warehouse_path: str) -> List[Dict]:
    """
    加载 warehouse/extracted 下的所有教材
    
    Args:
        warehouse_path: warehouse 根目录路径
        
    Returns:
        所有教材的列表
    """
    extracted_dir = Path(warehouse_path) / "extracted"
    
    if not extracted_dir.exists():
        raise FileNotFoundError(f"目录不存在: {extracted_dir}")
    
    textbooks = []
    
    # 按顺序加载7本教材
    for book_name in sorted(TEXTBOOK_MAPPING.keys()):
        book_dir = extracted_dir / book_name
        if book_dir.exists():
            try:
                textbook_data = load_single_textbook(str(extracted_dir), book_name)
                textbooks.append(textbook_data)
            except Exception as e:
                logger.error(f"加载教材 {book_name} 失败: {e}", exc_info=True)
        else:
            logger.warning(f"教材目录不存在: {book_dir}")
    
    logger.info(f"共加载 {len(textbooks)} 本教材")
    return textbooks


def save_textbook_to_json(textbook_data: Dict, output_dir: str) -> str:
    """
    将教材数据保存为 JSON 文件
    
    Args:
        textbook_data: 教材数据字典
        output_dir: 输出目录
        
    Returns:
        保存的文件路径
    """
    output_path = Path(output_dir) / f"{textbook_data['textbook_id']}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(textbook_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"教材数据已保存到: {output_path}")
    return str(output_path)


def main():
    """
    主函数：测试加载器
    """
    # 从环境变量获取 warehouse 路径
    warehouse_path = os.getenv('WAREHOUSE_PATH', '/data/lidubai/lidubai/hackathon/warehouse')
    
    logger.info(f"Warehouse 路径: {warehouse_path}")
    
    # 测试加载单本教材
    logger.info("\n========== 测试加载单本教材 ==========")
    try:
        textbook = load_single_textbook(
            f"{warehouse_path}/extracted",
            "01_局部解剖学"
        )
        print(json.dumps(textbook, ensure_ascii=False, indent=2)[:1000] + "...")
    except Exception as e:
        logger.error(f"测试失败: {e}", exc_info=True)
    
    # 测试加载所有教材
    logger.info("\n========== 测试加载所有教材 ==========")
    try:
        textbooks = load_all_textbooks(warehouse_path)
        
        # 打印统计信息
        for tb in textbooks:
            logger.info(
                f"{tb['textbook_id']}: {tb['title']} - "
                f"{len(tb['chapters'])}章, {tb['total_chars']}字, {tb['total_pages']}页"
            )
    except Exception as e:
        logger.error(f"测试失败: {e}", exc_info=True)


if __name__ == "__main__":
    main()
