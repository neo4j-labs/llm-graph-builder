FROM python:3.12-slim
WORKDIR /code
ENV PORT 8000
EXPOSE 8000
# Install dependencies and clean up in one layer
RUN apt-get update && \
   apt-get install -y --no-install-recommends \
       libmagic1 \
       libgl1 \
       libglx-mesa0 \
       libreoffice \
       cmake \
       poppler-utils \
       tesseract-ocr && \
   apt-get clean && \
   rm -rf /var/lib/apt/lists/*

# Set LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
# Copy requirements file and install Python dependencies
COPY requirements.txt constraints.txt /code/
# --no-cache-dir --upgrade 
RUN pip install --upgrade pip
RUN pip install -r requirements.txt -c constraints.txt

RUN python -c "from transformers import AutoTokenizer, AutoModel; \
   name='sentence-transformers/all-MiniLM-L6-v2'; \
   tok=AutoTokenizer.from_pretrained(name); \
   mod=AutoModel.from_pretrained(name); \
   tok.save_pretrained('./local_model'); \
   mod.save_pretrained('./local_model')"

RUN python -m nltk.downloader -d /usr/local/nltk_data punkt
RUN python -m nltk.downloader -d /usr/local/nltk_data averaged_perceptron_tagger

# Copy application code
COPY . /code
# Set command
CMD ["gunicorn", "score:app", "--workers", "8","--threads", "8", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]
