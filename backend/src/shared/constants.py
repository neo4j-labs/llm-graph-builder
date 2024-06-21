MODEL_VERSIONS = {
        "gpt-3.5": "gpt-3.5-turbo-16k",
        "gemini-1.0-pro": "gemini-1.0-pro-001",
        "gemini-1.5-pro": "gemini-1.5-pro-preview-0514",
        "gpt-4": "gpt-4-0125-preview",
        "diffbot" : "gpt-4o",
        "gpt-4o":"gpt-4o",
        "groq-llama3" : "llama3-70b-8192"
         }
OPENAI_MODELS = ["gpt-3.5", "gpt-4o"]
GEMINI_MODELS = ["gemini-1.0-pro", "gemini-1.5-pro"]
CHAT_MAX_TOKENS = 1000
CHAT_SEARCH_KWARG_K = 3
CHAT_SEARCH_KWARG_SCORE_THRESHOLD = 0.7
GROQ_MODELS = ["groq-llama3"]
BUCKET_UPLOAD = 'llm-graph-builder-upload'
PROJECT_ID = 'llm-experiments-387609'
