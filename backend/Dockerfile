FROM python:3.10-slim
WORKDIR /code
ENV PORT 8000
EXPOSE 8000
# ENV PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION python
# Clean up apt cache and install keyring packages
RUN rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    apt-get -o Acquire::AllowInsecureRepositories=true update && \
    apt-get install -y --no-install-recommends --no-install-suggests \
    debian-keyring \
    debian-archive-keyring \
    gnupg \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Now update and install dependencies including build tools
RUN apt-get update && \
   apt-get install -y --no-install-recommends --no-install-suggests \
       libmagic1 \
       libgl1-mesa-glx \
       libreoffice \
       cmake \
       poppler-utils \
       tesseract-ocr \
       build-essential \
       python3-dev \
       gcc \
       autoconf \
       automake \
       libtool \
       pkg-config && \
   apt-get clean && \
   rm -rf /var/lib/apt/lists/*

# Manually fetch the latest Debian signing key before updating apt repositories
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 648ACFD622F3D138

# Set LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

ENV PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION='python'

# Copy requirements file and install Python dependencies
COPY requirements.txt constraints.txt /code/
# --no-cache-dir --upgrade 
RUN pip --version
RUN pip install --upgrade pip
RUN pip --version
RUN pip install -r requirements.txt -c constraints.txt 
RUN python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device count: {torch.cuda.device_count()}')"
# RUN pip install -r requirements.txt
# Copy application code
COPY . /code

# Set command
# CMD ["gunicorn", "score:app", "--workers", "8","--threads", "8", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"] # original line
CMD ["gunicorn", "score:app", "--workers", "2","--threads", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]
