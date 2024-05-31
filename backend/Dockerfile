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
RUN pip install --no-cache-dir --upgrade -r requirements.txt
# Copy application code
COPY . /code
RUN apt-get update \
    && apt-get install -y libgl1-mesa-glx cmake \
    && apt-get install -y poppler-utils \
    && apt install -y tesseract-ocr \
    && export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH \
    && pip install --no-cache-dir --upgrade -r /code/requirements.txt
    
# CMD ["uvicorn", "score:app", "--host", "0.0.0.0", "--port", "8000","--workers", "4"]
CMD ["gunicorn", "score:app","--workers","4","--worker-class","uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]

