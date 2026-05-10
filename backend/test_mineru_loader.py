"""
测试 MinerU 加载器并保存示例数据
"""

import json
import os
from pathlib import Path
from src.mineru_loader import load_single_textbook, load_all_textbooks

# 设置 warehouse 路径
warehouse_path = os.getenv('WAREHOUSE_PATH', '/data/lidubai/lidubai/hackathon/warehouse')
output_dir = Path(__file__).parent / "data" / "parsed_textbooks"
output_dir.mkdir(parents=True, exist_ok=True)

def test_single_textbook():
    """测试加载单本教材"""
    print("=" * 60)
    print("测试加载单本教材: 01_局部解剖学")
    print("=" * 60)
    
    textbook = load_single_textbook(
        f"{warehouse_path}/extracted",
        "01_局部解剖学"
    )
    
    # 打印基本信息
    print(f"\n教材ID: {textbook['textbook_id']}")
    print(f"标题: {textbook['title']}")
    print(f"总页数: {textbook['total_pages']}")
    print(f"总字数: {textbook['total_chars']}")
    print(f"章节数: {len(textbook['chapters'])}")
    
    # 打印章节列表
    print("\n章节列表:")
    for ch in textbook['chapters']:
        print(f"  {ch['chapter_id']}: {ch['title']} (页码 {ch['page_start']}-{ch['page_end']}, {ch['char_count']}字)")
    
    # 打印第一章的前500字
    if textbook['chapters']:
        first_chapter = textbook['chapters'][0]
        print(f"\n{first_chapter['title']} 内容预览:")
        print(first_chapter['content'][:500] + "...")
    
    # 保存到文件
    output_path = output_dir / f"{textbook['textbook_id']}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(textbook, f, ensure_ascii=False, indent=2)
    print(f"\n已保存到: {output_path}")
    
    return textbook


def test_all_textbooks():
    """测试加载所有教材"""
    print("\n" + "=" * 60)
    print("测试加载所有教材")
    print("=" * 60)
    
    textbooks = load_all_textbooks(warehouse_path)
    
    # 统计信息
    total_chapters = sum(len(tb['chapters']) for tb in textbooks)
    total_chars = sum(tb['total_chars'] for tb in textbooks)
    total_pages = sum(tb['total_pages'] for tb in textbooks)
    
    print(f"\n总计:")
    print(f"  教材数: {len(textbooks)}")
    print(f"  章节数: {total_chapters}")
    print(f"  总字数: {total_chars:,}")
    print(f"  总页数: {total_pages}")
    
    print("\n各教材统计:")
    for tb in textbooks:
        print(f"  {tb['textbook_id']}: {tb['title']:<12} - {len(tb['chapters']):>2}章, {tb['total_chars']:>7}字, {tb['total_pages']:>3}页")
    
    # 保存所有教材
    for tb in textbooks:
        output_path = output_dir / f"{tb['textbook_id']}.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(tb, f, ensure_ascii=False, indent=2)
    
    print(f"\n所有教材数据已保存到: {output_dir}")
    
    # 保存汇总信息
    summary = {
        "total_textbooks": len(textbooks),
        "total_chapters": total_chapters,
        "total_chars": total_chars,
        "total_pages": total_pages,
        "textbooks": [
            {
                "textbook_id": tb['textbook_id'],
                "title": tb['title'],
                "chapters": len(tb['chapters']),
                "chars": tb['total_chars'],
                "pages": tb['total_pages']
            }
            for tb in textbooks
        ]
    }
    
    summary_path = output_dir / "summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"汇总信息已保存到: {summary_path}")
    
    return textbooks


if __name__ == "__main__":
    # 测试单本教材
    test_single_textbook()
    
    # 测试所有教材
    test_all_textbooks()
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
