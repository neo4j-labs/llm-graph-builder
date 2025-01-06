class LLMGraphBuilderException(Exception):
    """Exception raised for custom error in the application."""

    def __init__(self, message):
        self.message = message
        super().__init__(message)