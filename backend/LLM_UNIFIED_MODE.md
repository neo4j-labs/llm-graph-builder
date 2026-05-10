# LLM 统一模式使用说明

## 修改概述

本次修改使 `backend/src/llm.py` 支持通过 `base_url` + `api_key` 的方式调用任意 OpenAI 兼容的 LLM API。

## 核心改动

### 1. 修改的函数
- `get_llm(model: str)` - 在函数开头添加了统一模式的检查逻辑

### 2. 新增逻辑流程

```python
def get_llm(model: str):
    # 第一优先级: 统一模式
    if LLM_BASE_URL 存在:
        使用 ChatOpenAI(base_url, api_key, model) 创建实例
        返回 (llm, model_name, callback_handler)
    
    # 第二优先级: 原有 fallback 逻辑
    else:
        使用 LLM_MODEL_CONFIG_{model} 环境变量
        根据 provider 类型创建对应的 LLM 实例
```

## 环境变量配置

### 统一模式（推荐）

在 `backend/.env` 中配置以下三个环境变量:

```bash
LLM_BASE_URL=https://kfcv50.link/v1
LLM_API_KEY=sk-CU52ezqQb8M4iBGk76C5A34a8d554470AaF7BdC5E1D716C3
LLM_MODEL_NAME=gpt-4.1-2025-04-14
```

**特点:**
- ✅ 简单易用,只需三个环境变量
- ✅ 支持任意 OpenAI 兼容的 API 端点
- ✅ 无需修改代码即可切换不同的 API 提供商
- ✅ `get_llm()` 的 `model` 参数在统一模式下会被忽略

### Fallback 模式（兼容性）

如果不设置 `LLM_BASE_URL`,系统会使用原有的 `LLM_MODEL_CONFIG_*` 逻辑:

```bash
# 示例: OpenAI
LLM_MODEL_CONFIG_OPENAI_GPT_4=gpt-4,sk-xxx

# 示例: Azure OpenAI
LLM_MODEL_CONFIG_AZURE_GPT_4=deployment-name,endpoint,key,version

# 示例: Anthropic
LLM_MODEL_CONFIG_ANTHROPIC_CLAUDE=claude-3-opus,sk-xxx
```

**特点:**
- ✅ 保留原有所有 provider 支持（OpenAI、Azure、Gemini、Anthropic、Fireworks、Groq、Bedrock、Ollama、Diffbot）
- ✅ 向后兼容,不影响现有配置

## 使用示例

### 在代码中使用

```python
from src.llm import get_llm

# 统一模式:由于 LLM_BASE_URL 已设置,model 参数会被忽略
llm, model_name, callback_handler = get_llm("any_model_name")

# 使用 LLM
response = llm.invoke("你好")
print(response.content)
```

### 切换不同的 API 提供商

只需修改 `.env` 文件中的 `LLM_BASE_URL`:

```bash
# 使用自定义端点
LLM_BASE_URL=https://kfcv50.link/v1

# 使用 OpenAI 官方
LLM_BASE_URL=https://api.openai.com/v1

# 使用其他兼容 OpenAI 的服务
LLM_BASE_URL=https://your-custom-api.com/v1
```

## 测试验证

运行配置测试脚本:

```bash
cd /data/lidubai/lidubai/hackathon/Med-KG-QA/backend
python3 test_llm_config.py
```

**预期输出:**
```
✅ 统一模式配置完整!
✅ Base URL 格式正确
✅ API Key 格式正确
✅ 模型名称已设置
```

## 代码改动详情

### 修改前 (原始代码)

```python
def get_llm(model: str):
    """Retrieve the specified language model based on the model name."""
    model = model.upper().replace('.', '_').strip()
    env_key = f"LLM_MODEL_CONFIG_{model}"
    env_value = get_value_from_env(env_key)
    # ... 后续逻辑
```

### 修改后 (新代码)

```python
def get_llm(model: str):
    """Retrieve the specified language model based on the model name."""
    
    # 优先检查统一模式的环境变量
    base_url = get_value_from_env("LLM_BASE_URL")
    if base_url:
        api_key = get_value_from_env("LLM_API_KEY")
        model_name = get_value_from_env("LLM_MODEL_NAME")
        
        if not api_key or not model_name:
            err = "LLM_BASE_URL is set, but LLM_API_KEY or LLM_MODEL_NAME is missing"
            logging.error(err)
            raise Exception(err)
        
        logging.info(f"Using unified LLM mode: base_url={base_url}, model={model_name}")
        callback_handler = UniversalTokenUsageHandler()
        callback_manager = CallbackManager([callback_handler])
        
        try:
            llm = ChatOpenAI(
                api_key=api_key,
                base_url=base_url,
                model=model_name,
                temperature=0,
                callbacks=callback_manager,
            )
            logging.info(f"Unified LLM created successfully - Model: {model_name}")
            return llm, model_name, callback_handler
        except Exception as e:
            err = f"Error while creating unified LLM: {str(e)}"
            logging.error(err)
            raise Exception(err)
    
    # Fallback 到原有的 LLM_MODEL_CONFIG_* 逻辑
    model = model.upper().replace('.', '_').strip()
    env_key = f"LLM_MODEL_CONFIG_{model}"
    env_value = get_value_from_env(env_key)
    # ... 原有逻辑保持不变
```

## 关键特性

1. **优先级明确**: 统一模式 > Fallback 模式
2. **完全兼容**: 不影响原有代码和配置
3. **错误处理**: 完善的异常处理和日志记录
4. **返回格式**: 保持 `(llm, model_name, callback_handler)` 三元组格式
5. **Token 统计**: 通过 `UniversalTokenUsageHandler` 统计 token 使用量

## 注意事项

1. **环境变量优先级**: 如果同时设置了 `LLM_BASE_URL` 和 `LLM_MODEL_CONFIG_*`,系统会优先使用统一模式
2. **Model 参数忽略**: 在统一模式下,`get_llm(model)` 的 `model` 参数会被忽略,实际使用 `LLM_MODEL_NAME` 环境变量的值
3. **API 兼容性**: 目标 API 必须兼容 OpenAI 的接口规范
4. **Temperature 设置**: 统一模式默认使用 `temperature=0`,确保输出的确定性

## 相关文件

- 修改的文件: `/data/lidubai/lidubai/hackathon/Med-KG-QA/backend/src/llm.py`
- 配置文件: `/data/lidubai/lidubai/hackathon/Med-KG-QA/backend/.env`
- 测试脚本: `/data/lidubai/lidubai/hackathon/Med-KG-QA/backend/test_llm_config.py`

## 版本信息

- 修改日期: 2026-05-10
- 修改者: Claude Agent
- 版本: v1.0
