#!/usr/bin/env python3
"""
医学知识点提取模块 - 快速测试示例

演示如何从医学教材章节中提取知识点和关系
"""

import asyncio
import sys
import os
import json

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))

from knowledge_extract import (
    extract_knowledge_from_chapter,
    extract_knowledge_from_textbook,
    save_knowledge_graph
)


async def example_single_chapter():
    """示例1: 提取单个章节的知识点"""
    
    print("="*60)
    print("示例1: 单章节知识点提取")
    print("="*60)
    
    # 准备测试数据 - 解剖学章节
    chapter = {
        "chapter_id": "ch_02",
        "title": "第二章 细胞的基本功能 - 细胞膜的物质转运",
        "page_start": 25,
        "page_end": 40,
        "content": """
        细胞膜的物质转运是指物质通过细胞膜进出细胞的过程。根据是否消耗能量，
        可分为被动转运和主动转运。
        
        一、被动转运
        被动转运是指物质顺浓度梯度或电位梯度跨膜转运的过程，不消耗ATP。
        包括单纯扩散、易化扩散和渗透。
        
        1. 单纯扩散（simple diffusion）
        脂溶性小分子物质（如O2、CO2、乙醇）和小分子非脂溶性物质（如H2O、尿素）
        可直接通过脂质双分子层进行扩散，顺浓度梯度进行。
        
        2. 易化扩散（facilitated diffusion）
        大分子或不溶于脂质的物质需要借助膜蛋白的帮助才能顺浓度梯度通过细胞膜。
        包括经载体介导的易化扩散和经通道介导的易化扩散。
        
        - 载体蛋白：具有特异性，如葡萄糖转运蛋白（GLUT）
        - 通道蛋白：具有选择性，如钠离子通道、钾离子通道、钙离子通道
        
        3. 渗透（osmosis）
        水分子通过半透膜从低浓度溶液向高浓度溶液的扩散过程。
        水通道蛋白（aquaporin, AQP）介导水的快速转运。
        
        二、主动转运
        主动转运是指物质逆浓度梯度或电位梯度进行的跨膜转运，需要消耗ATP。
        
        1. 原发性主动转运
        直接利用ATP水解释放的能量进行物质转运。
        
        钠钾泵（Na+-K+ pump）：
        - 是一种ATP酶
        - 将3个Na+泵出细胞，同时将2个K+泵入细胞
        - 维持细胞内高K+、低Na+状态
        - 维持静息电位
        - 参与渗透压调节
        
        2. 继发性主动转运
        利用原发性主动转运形成的离子浓度梯度势能进行物质转运。
        例如：Na+-葡萄糖同向转运体，利用Na+内流的势能转运葡萄糖进入细胞。
        
        三、胞吞和胞吐
        大分子物质和颗粒性物质的转运方式。
        
        胞吞（endocytosis）：细胞膜内陷，将物质包裹后进入细胞内。
        - 吞噬作用（phagocytosis）：吞噬固体颗粒
        - 胞饮作用（pinocytosis）：摄入液体
        
        胞吐（exocytosis）：细胞内物质通过囊泡与细胞膜融合释放到细胞外。
        如神经递质的释放。
        """,
        "char_count": 850
    }
    
    textbook_info = {
        "textbook_id": "book_physiology_01",
        "title": "生理学（第9版）"
    }
    
    # 提取知识点
    print("\n正在调用 LLM 提取知识点...\n")
    result = await extract_knowledge_from_chapter(chapter, textbook_info)
    
    # 显示结果
    print(f"\n✓ 提取完成！")
    print(f"  - 知识点数量: {len(result['nodes'])}")
    print(f"  - 关系数量: {len(result['relations'])}")
    
    print("\n" + "-"*60)
    print("提取的知识点：")
    print("-"*60)
    
    for i, node in enumerate(result['nodes'][:5], 1):  # 只显示前5个
        print(f"\n{i}. 【{node['category']}】{node['name']}")
        print(f"   定义: {node['definition'][:80]}...")
        print(f"   来源: {node['chapter']}, 第{node['page']}页")
    
    if len(result['nodes']) > 5:
        print(f"\n   ... 还有 {len(result['nodes']) - 5} 个知识点")
    
    print("\n" + "-"*60)
    print("知识点关系：")
    print("-"*60)
    
    for i, rel in enumerate(result['relations'][:5], 1):  # 只显示前5个
        # 查找节点名称
        source_name = next((n['name'] for n in result['nodes'] if n['id'] == rel['source']), 'unknown')
        target_name = next((n['name'] for n in result['nodes'] if n['id'] == rel['target']), 'unknown')
        
        print(f"\n{i}. [{rel['relation_type']}]")
        print(f"   {source_name} → {target_name}")
        print(f"   {rel['description'][:80]}...")
    
    if len(result['relations']) > 5:
        print(f"\n   ... 还有 {len(result['relations']) - 5} 个关系")
    
    # 保存结果
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'example_single_chapter.json')
    save_knowledge_graph(result, output_path)
    
    print(f"\n✓ 结果已保存到: {output_path}")
    
    return result


async def example_mini_textbook():
    """示例2: 提取迷你教材（2个章节）"""
    
    print("\n\n" + "="*60)
    print("示例2: 多章节教材知识点提取")
    print("="*60)
    
    # 准备测试数据 - 迷你教材
    textbook = {
        "textbook_id": "book_anatomy_mini",
        "title": "局部解剖学精要",
        "chapters": [
            {
                "chapter_id": "ch_01",
                "title": "第一章 头部 - 颅的组成",
                "page_start": 1,
                "page_end": 20,
                "content": """
                颅（cranium）分为脑颅和面颅。脑颅包容和保护脑，面颅构成面部骨性支架。
                
                一、脑颅
                脑颅由8块颅骨组成：
                - 不成对的：额骨、蝶骨、筛骨、枕骨
                - 成对的：顶骨、颞骨
                
                额骨（frontal bone）位于颅前部，参与构成颅顶、眶上壁和前颅窝。
                额骨内含额窦，与鼻腔相通。
                
                顶骨（parietal bone）构成颅顶和颅侧壁的大部分。
                左右顶骨通过矢状缝相连。
                
                颞骨（temporal bone）位于颅底和颅侧壁下部。
                颞骨分为鳞部、鼓部、乳突部和岩部。
                岩部内含内耳器官（听觉和平衡感受器）。
                
                枕骨（occipital bone）构成颅后部和颅底后部。
                枕骨上有枕骨大孔，脊髓从此穿过与脑相连。
                
                二、颅缝
                颅骨之间通过缝连接：
                - 冠状缝：额骨与顶骨之间
                - 矢状缝：左右顶骨之间
                - 人字缝：枕骨与顶骨之间
                
                新生儿颅缝未完全闭合，骨化不全处形成囟（fontanelle）。
                前囟最大，位于冠状缝与矢状缝交点，出生后1-1.5岁闭合。
                """,
                "char_count": 450
            },
            {
                "chapter_id": "ch_02",
                "title": "第二章 颈部 - 颈部的分区和标志",
                "page_start": 21,
                "page_end": 35,
                "content": """
                颈部（neck）连接头部和躯干，为许多重要器官和血管神经的通路。
                
                一、颈部的境界和分区
                上界：下颌骨下缘、下颌角、乳突、枕外隆凸连线
                下界：胸骨上缘、锁骨、肩峰、第七颈椎棘突连线
                
                颈部分为前区和后区：
                - 前区（anterior region）：以胸锁乳突肌前缘为界
                - 后区（posterior region）：胸锁乳突肌后缘至斜方肌前缘
                
                二、颈部的筋膜和间隙
                颈深筋膜（deep cervical fascia）分为三层：
                
                1. 封套筋膜（investing fascia）
                   - 最浅层，包裹整个颈部
                   - 包绕胸锁乳突肌和斜方肌
                
                2. 气管前筋膜（pretracheal fascia）
                   - 包裹甲状腺、气管、食管
                   - 向上附着于舌骨
                
                3. 椎前筋膜（prevertebral fascia）
                   - 覆盖椎前肌和斜角肌
                   - 最深层
                
                颈筋膜之间形成潜在间隙：
                - 咽后间隙：气管前筋膜与椎前筋膜之间
                - 颈动脉鞘：包绕颈总动脉、颈内静脉和迷走神经
                
                三、重要结构
                甲状腺（thyroid gland）：
                - 位于喉和气管前方
                - 分左、右两叶和峡部
                - 甲状腺上、下动脉供血
                - 分泌甲状腺激素，调节新陈代谢
                
                颈动脉三角：
                - 重要的血管神经区域
                - 含颈总动脉分叉（分为颈内、外动脉）
                - 颈动脉窦：压力感受器
                - 颈动脉小球：化学感受器
                """,
                "char_count": 520
            }
        ]
    }
    
    # 提取整本教材的知识点
    print("\n正在处理多个章节...\n")
    result = await extract_knowledge_from_textbook(textbook)
    
    # 显示结果
    print(f"\n✓ 提取完成！")
    print(f"  - 教材: {result['textbook_title']}")
    print(f"  - 章节数: {result['chapter_count']}")
    print(f"  - 总知识点: {len(result['nodes'])}")
    print(f"  - 总关系: {len(result['relations'])}")
    
    # 按章节统计
    print("\n" + "-"*60)
    print("按章节统计：")
    print("-"*60)
    
    for chapter in textbook['chapters']:
        chapter_title = chapter['title']
        chapter_nodes = [n for n in result['nodes'] if n['chapter'] == chapter_title]
        print(f"\n{chapter_title}")
        print(f"  知识点: {len(chapter_nodes)} 个")
    
    # 按分类统计
    print("\n" + "-"*60)
    print("按分类统计：")
    print("-"*60)
    
    category_count = {}
    for node in result['nodes']:
        cat = node['category']
        category_count[cat] = category_count.get(cat, 0) + 1
    
    for cat, count in sorted(category_count.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count} 个")
    
    # 按关系类型统计
    print("\n" + "-"*60)
    print("按关系类型统计：")
    print("-"*60)
    
    relation_count = {}
    for rel in result['relations']:
        rel_type = rel['relation_type']
        relation_count[rel_type] = relation_count.get(rel_type, 0) + 1
    
    for rel_type, count in sorted(relation_count.items(), key=lambda x: -x[1]):
        print(f"  {rel_type}: {count} 个")
    
    # 保存结果
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'example_mini_textbook.json')
    save_knowledge_graph(result, output_path)
    
    print(f"\n✓ 结果已保存到: {output_path}")
    
    return result


async def main():
    """主函数：运行所有示例"""
    
    print("\n" + "="*60)
    print("医学知识点提取模块 - 测试示例")
    print("="*60)
    print("\n提示: 需要配置 .env 文件中的 LLM_BASE_URL 和 LLM_API_KEY\n")
    
    try:
        # 示例 1: 单章节提取
        result1 = await example_single_chapter()
        
        # 示例 2: 多章节提取
        result2 = await example_mini_textbook()
        
        print("\n" + "="*60)
        print("所有示例运行完成！")
        print("="*60)
        print("\n生成的文件：")
        print("  - output/example_single_chapter.json")
        print("  - output/example_mini_textbook.json")
        print("\n可以使用这些 JSON 文件进行知识图谱可视化或后续处理。\n")
        
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        print("\n请检查:")
        print("  1. .env 文件中的 LLM 配置是否正确")
        print("  2. API Key 是否有效")
        print("  3. 网络连接是否正常")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
