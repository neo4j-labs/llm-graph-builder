#!/bin/bash
set -e  # Exit immediately if a command fails

echo "starting environment setup..."

echo "Syncing pyproject.toml dependencies with uv..."
uv sync

echo "Installing torch CPU-only build..."
uv pip install torch==2.1.0+cpu torchvision==0.16.0+cpu torchaudio==2.1.0+cpu \
 --index-url https://download.pytorch.org/whl/cpu

echo "Setup complete! Ready to run."