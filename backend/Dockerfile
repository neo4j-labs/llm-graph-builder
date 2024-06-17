FROM python:3.10-slim
 
WORKDIR /code
ENV PORT 8000
EXPOSE 8000
 
# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    cmake \
    poppler-utils \
    tesseract-ocr
 
# Set LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
 
# Copy requirements file
COPY requirements.txt /code/
 
# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt
 
# Copy application code
COPY . /code
 
# Set command
CMD ["gunicorn", "score:app","--workers","2","--worker-class","uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]
