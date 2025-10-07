import os
from google.cloud import logging as gclogger


class CustomLogger:
    def __init__(self):
        self.logger = None

    def log_struct(self, message, severity="DEFAULT"):
        print(f"[{severity}]{message}")
