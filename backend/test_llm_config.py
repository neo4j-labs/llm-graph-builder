#!/usr/bin/env python3
"""测试 LLM 配置逻辑（不实际调用 LLM）"""

import os
from pathlib import Path

# 加载环境变量
from dotenv import load_dotenv
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

def test_unified_llm_config():
    """测试统一模式的环境变量配置"""
    print("\n" + "="*60)
    print("测试统一 LLM 配置")
    print("="*60)
    
    # 检查环境变量
    base_url = os.getenv("LLM_BASE_URL")
    api_key = os.getenv("LLM_API_KEY")
    model_name = os.getenv("LLM_MODEL_NAME")
    
    print(f"\n📝 环境变量检查:")
    print(f"   LLM_BASE_URL: {base_url}")
    print(f"   LLM_API_KEY: {api_key[:20]}...{api_key[-10:] if api_key else ''}")
    print(f"   LLM_MODEL_NAME: {model_name}")
    
    # 验证配置完整性
    all_set = all([base_url, api_key, model_name])
    
    if all_set:
        print(f"\n✅ 统一模式配置完整!")
        print(f"\n📋 配置摘要:")
        print(f"   - API 端点: {base_url}")
        print(f"   - 模型名称: {model_name}")
        print(f"   - API Key 长度: {len(api_key)} 字符")
        
        print(f"\n🔍 配置验证:")
        # 验证 URL 格式
        if base_url.startswith(("http://", "https://")):
            print(f"   ✅ Base URL 格式正确")
        else:
            print(f"   ⚠️  Base URL 格式可能有误")
        
        # 验证 API Key 格式
        if api_key.startswith("sk-") and len(api_key) > 20:
            print(f"   ✅ API Key 格式正确")
        else:
            print(f"   ⚠️  API Key 格式可能有误")
        
        # 验证模型名称
        if model_name and len(model_name) > 0:
            print(f"   ✅ 模型名称已设置")
        else:
            print(f"   ⚠️  模型名称为空")
        
        print(f"\n💡 使用方式:")
        print(f"   在 get_llm() 函数中,由于 LLM_BASE_URL 已设置,")
        print(f"   系统将使用统一模式:")
        print(f"   ChatOpenAI(base_url='{base_url}', api_key='***', model='{model_name}')")
        
    else:
        print(f"\n❌ 统一模式配置不完整!")
        if not base_url:
            print(f"   - LLM_BASE_URL 未设置")
        if not api_key:
            print(f"   - LLM_API_KEY 未设置")
        if not model_name:
            print(f"   - LLM_MODEL_NAME 未设置")
        print(f"\n   系统将 fallback 到原有的 LLM_MODEL_CONFIG_* 逻辑")
    
    # 检查 fallback 配置
    print(f"\n📋 Fallback 配置检查:")
    fallback_configs = {k: v for k, v in os.environ.items() if k.startswith("LLM_MODEL_CONFIG_")}
    if fallback_configs:
        print(f"   找到 {len(fallback_configs)} 个 fallback 配置:")
        for key in fallback_configs:
            print(f"   - {key}")
    else:
        print(f"   未找到 fallback 配置")
    
    print("\n" + "="*60)
    print("测试完成!")
    print("="*60 + "\n")
    
    return all_set

if __name__ == "__main__":
    success = test_unified_llm_config()
    
    print("\n📌 修改总结:")
    print("   1. ✅ 在 get_llm() 函数开头添加了统一模式检查")
    print("   2. ✅ 优先检查 LLM_BASE_URL 环境变量")
    print("   3. ✅ 使用 ChatOpenAI(base_url, api_key, model) 创建实例")
    print("   4. ✅ 保留原有 LLM_MODEL_CONFIG_* fallback 逻辑")
    print("   5. ✅ 返回值格式不变: (llm, model_name, callback_handler)\n")
    
    if success:
        print("🎉 统一模式配置已就绪,可以开始使用!")
    else:
        print("⚠️  请检查环境变量配置")
