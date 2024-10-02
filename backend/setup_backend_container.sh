#!/bin/bash


set -e  # Exit immediately if a command exits with a non-zero status


apt-get update && apt-get install -y git
pip install --upgrade pip

echo "Installing debugpy..."
pip install debugpy

echo "Setup completed successfully."

python -m debugpy --log-to /code/debugpy.log --listen 0.0.0.0:5678 -m gunicorn -w 8 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 300 score:app

