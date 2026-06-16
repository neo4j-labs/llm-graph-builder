"""\nToken management system for handling multiple API keys with fallback\n"""
import logging
from typing import Optional, Tuple, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.callbacks.manager import CallbackManager
from src.shared.common_fn import UniversalTokenUsageHandler, get_value_from_env

class TokenManager:
    """مدیر توکن‌ها برای مدیریت توکن‌های متعدد و fallback"""
    
    def __init__(self, token_prefix: str = "GEMINI_API_KEYS"):
        """Initialize TokenManager
        
        Args:
            token_prefix: Prefix for environment variable names (default: GEMINI_API_KEYS)
        """
        self.current_token_index = 0
        self.tokens = []
        self.token_prefix = token_prefix
        self.token_stats: Dict[int, Dict] = {}  # Track token usage stats
        self.load_tokens()
    
    def load_tokens(self):
        """Load all available tokens from environment variables
        
        Expected format:
        - GEMINI_API_KEYS_1=your_first_api_key
        - GEMINI_API_KEYS_2=your_second_api_key
        - GEMINI_API_KEYS_3=your_third_api_key
        """
        token_index = 1
        while True:
            env_key = f"{self.token_prefix}_{token_index}"
            token = get_value_from_env(env_key)
            if not token:
                break
            self.tokens.append(token)
            self.token_stats[token_index - 1] = {
                "failures": 0,
                "successes": 0,
                "last_used": None
            }
            token_index += 1
        
        logging.info(f"Loaded {len(self.tokens)} API tokens")
        if not self.tokens:
            raise Exception(f"No {self.token_prefix} found in environment variables. "
                          f"Please set {self.token_prefix}_1, {self.token_prefix}_2, etc.")
    
    def get_current_token(self) -> str:
        """Get the current active token"""
        if not self.tokens:
            raise Exception("No tokens available")
        return self.tokens[self.current_token_index]
    
    def switch_to_next_token(self) -> bool:
        """Switch to the next available token
        
        Returns:
            bool: True if switched successfully, False if no more tokens
        """
        if self.current_token_index < len(self.tokens) - 1:
            self.current_token_index += 1
            logging.info(f"Switched to token {self.current_token_index + 1}/{len(self.tokens)}")
            self.token_stats[self.current_token_index]["last_used"] = "now"
            return True
        return False
    
    def mark_token_failure(self):
        """Mark current token as failed"""
        self.token_stats[self.current_token_index]["failures"] += 1
    
    def mark_token_success(self):
        """Mark current token as successful"""
        self.token_stats[self.current_token_index]["successes"] += 1
    
    def reset_token_index(self):
        """Reset to first token"""
        self.current_token_index = 0
        logging.info("Reset to first token")
    
    def get_stats(self) -> Dict:
        """Get token usage statistics"""
        return {
            "current_token_index": self.current_token_index,
            "total_tokens": len(self.tokens),
            "token_stats": self.token_stats
        }


def get_gemini_with_token_rotation(model_name: str, token_manager: Optional[TokenManager] = None) -> Tuple:
    """Create Gemini LLM with token rotation support
    
    Args:
        model_name: Name of Gemini model (e.g., 'gemini-1.5-flash', 'gemini-1.5-pro')
        token_manager: Optional TokenManager instance (creates new if not provided)
    
    Returns:
        Tuple: (llm_instance, model_name, callback_handler, token_manager)
    """
    if token_manager is None:
        token_manager = TokenManager()
    
    callback_handler = UniversalTokenUsageHandler()
    callback_manager = CallbackManager([callback_handler])
    
    try:
        token = token_manager.get_current_token()
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            api_key=token,
            temperature=0,
            callbacks=callback_manager,
            safety_settings={
                "HARM_CATEGORY_UNSPECIFIED": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
            },
        )
        # Attach token manager to LLM instance for later access
        llm._token_manager = token_manager
        llm._model_type = "gemini_studio"
        
        logging.info(f"Created Gemini LLM (Google AI Studio) with token {token_manager.current_token_index + 1}")
        return llm, model_name, callback_handler, token_manager
    
    except Exception as e:
        logging.error(f"Error creating Gemini LLM: {str(e)}")
        token_manager.mark_token_failure()
        raise Exception(f"Error while creating Gemini LLM: {str(e)}")
