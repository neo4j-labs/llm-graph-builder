import os
from google.cloud import logging as gclogger

class CustomLogger:
    def __init__(self):
        self.is_gcp_log_enabled = os.environ.get("GCP_LOG_METRICS_ENABLED", "False").lower() in ("true", "1", "yes")
        if self.is_gcp_log_enabled:
            self.logging_client = gclogger.Client()
            self.logger_name = "llm_experiments_metrics"
            self.logger = self.logging_client.logger(self.logger_name)
        else:
            self.logger = None

    def log_struct(self, message, severity="DEFAULT"):
        if self.is_gcp_log_enabled and message is not None:
            self.logger.log_struct({"message": message, "severity": severity})
        else:
            print(f"[{severity}]{message}")
