"""\nError handling with automatic token fallback for API quota/rate limit errors\n"""
import logging
from typing import Any
from functools import wraps
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException

# List of error messages that indicate token/quota exhaustion
QUOTA_ERROR_PATTERNS = [
    "quota",
    "rate limit",
    "429",
    "403",
    "exhausted",
    "exceeded",
    "insufficient_quota",
    "resource_exhausted",
    "429 too many requests",
    "quota exceeded",
    "rate limit exceeded"
]

def is_quota_error(error_message: str) -> bool:
    """Check if error is related to quota/rate limit
    
    Args:
        error_message: Error message to check
    
    Returns:
        bool: True if error is quota/rate limit related
    """
    error_lower = error_message.lower()
    return any(pattern in error_lower for pattern in QUOTA_ERROR_PATTERNS)


def handle_token_exhaustion(max_retries: int = 3):
    """Decorator for handling token exhaustion with automatic fallback
    
    Args:
        max_retries: Maximum number of retry attempts (default: 3)
    
    Usage:
        @handle_token_exhaustion(max_retries=3)
        async def my_function(llm, ...):
            # Your code here
            pass
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            retry_count = 0
            last_error = None
            
            while retry_count < max_retries:
                try:
                    return await func(*args, **kwargs)
                
                except Exception as e:
                    last_error = e
                    error_message = str(e)
                    
                    # Check if error is quota/rate limit related
                    if is_quota_error(error_message):
                        logging.warning(f"Token quota/rate limit error: {error_message}")
                        
                        # Try to get LLM from kwargs or args
                        llm = kwargs.get('llm')
                        if not llm and len(args) > 0:
                            llm = args[0] if hasattr(args[0], '_token_manager') else None
                        
                        # Try to switch to next token
                        if llm and hasattr(llm, '_token_manager'):
                            token_manager = llm._token_manager
                            token_manager.mark_token_failure()
                            
                            if token_manager.switch_to_next_token():
                                logging.info(f"Retrying with next token (attempt {retry_count + 1}/{max_retries})")
                                retry_count += 1
                                
                                # Re-create LLM with new token
                                if hasattr(llm, '_model_type') and llm._model_type == 'gemini_studio':
                                    from src.token_manager import get_gemini_with_token_rotation
                                    model_name = llm.model_name if hasattr(llm, 'model_name') else 'gemini-1.5-flash'
                                    new_llm, _, _, _ = get_gemini_with_token_rotation(
                                        model_name=model_name,
                                        token_manager=token_manager
                                    )
                                    kwargs['llm'] = new_llm
                                continue
                            else:
                                raise LLMGraphBuilderException("All tokens exhausted!")
                        else:
                            logging.error("LLM does not have token manager attached")
                            raise
                    else:
                        # Not a quota error, raise immediately
                        raise
            
            # All retries exhausted
            raise LLMGraphBuilderException(
                f"Failed after {max_retries} retries with error: {str(last_error)}"
            )
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            """Synchronous wrapper (for sync functions)"""
            retry_count = 0
            last_error = None
            
            while retry_count < max_retries:
                try:
                    return func(*args, **kwargs)
                
                except Exception as e:
                    last_error = e
                    error_message = str(e)
                    
                    if is_quota_error(error_message):
                        logging.warning(f"Token quota/rate limit error: {error_message}")
                        llm = kwargs.get('llm')
                        
                        if llm and hasattr(llm, '_token_manager'):
                            token_manager = llm._token_manager
                            token_manager.mark_token_failure()
                            
                            if token_manager.switch_to_next_token():
                                logging.info(f"Retrying with next token (attempt {retry_count + 1}/{max_retries})")
                                retry_count += 1
                                continue
                            else:
                                raise LLMGraphBuilderException("All tokens exhausted!")
                        else:
                            raise
                    else:
                        raise
            
            raise LLMGraphBuilderException(
                f"Failed after {max_retries} retries with error: {str(last_error)}"
            )
        
        # Return appropriate wrapper based on function type
        if hasattr(func, '__code__') and 'async' in str(func.__code__.co_flags):
            return async_wrapper
        return sync_wrapper
    
    return decorator
