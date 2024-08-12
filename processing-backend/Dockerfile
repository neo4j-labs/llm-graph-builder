FROM python:3.10-slim
WORKDIR /code
ENV PORT 8000
EXPOSE 8000
# Install dependencies and clean up in one layer
RUN apt-get update && \
   apt-get install -y --no-install-recommends \
       libgl1-mesa-glx \
       libreoffice \
       cmake \
       poppler-utils \
       tesseract-ocr && \
   apt-get clean && \
   rm -rf /var/lib/apt/lists/*
# Set LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
# Copy requirements file and install Python dependencies
COPY requirements.txt /code/
# --no-cache-dir --upgrade 
RUN pip install -r requirements.txt 
# Copy application code
COPY . /code
# Set command
CMD ["gunicorn", "score:app", "--workers", "8","--preload","--threads", "8", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]
