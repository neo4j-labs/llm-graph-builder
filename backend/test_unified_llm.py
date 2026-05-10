#!/usr/bin/env python3
"""测试统一 LLM 模式的脚本"""

import sys
import os
from pathlib import Path

# 添加 src 目录到 Python 路径
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# 加载环境变量
from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from src.llm import get_llm
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_unified_llm():
    """测试统一模式的 LLM 创建"""
    try:
        print("\n" + "="*60)
        print("测试统一 LLM 模式")
        print("="*60)
        
        # 显示环境变量
        print(f"\nLLM_BASE_URL: {os.getenv('LLM_BASE_URL')}")
        print(f"LLM_MODEL_NAME: {os.getenv('LLM_MODEL_NAME')}")
        print(f"LLM_API_KEY: {os.getenv('LLM_API_KEY')[:20]}..." if os.getenv('LLM_API_KEY') else "Not set")
        
        # 测试创建 LLM（model 参数在统一模式下会被忽略）
        print("\n正在创建 LLM 实例...")
        llm, model_name, callback_handler = get_llm("any_model_name")
        
        print(f"\n✅ LLM 创建成功!")
        print(f"   - 模型名称: {model_name}")
        print(f"   - LLM 类型: {type(llm).__name__}")
        print(f"   - Callback Handler: {type(callback_handler).__name__ if callback_handler else 'None'}")
        print(f"   - Base URL: {llm.openai_api_base if hasattr(llm, 'openai_api_base') else 'N/A'}")
        
        # 测试简单的调用
        print("\n正在测试 LLM 调用...")
        response = llm.invoke("你好，请用一句话介绍你自己。")
        print(f"\n✅ LLM 调用成功!")
        print(f"   回答: {response.content[:100]}...")
        
        print("\n" + "="*60)
        print("测试完成!")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_unified_llm()
    sys.exit(0 if success else 1)
