FROM python:3.12-slim
WORKDIR /code
ENV PORT 8000
EXPOSE 8000
# Install dependencies and clean up in one layer
RUN apt-get update && \
   apt-get install -y --no-install-recommends \
       libmagic1 \
       libgl1 \
       libglib2.0-0 \
       libglx-mesa0 \
       libgomp1 \
       libreoffice \
       cmake \
       poppler-utils \
       tesseract-ocr \
       git && \
   apt-get clean && \
   rm -rf /var/lib/apt/lists/*

# Set LD_LIBRARY_PATH dynamically based on architecture
# x86_64 uses /usr/lib/x86_64-linux-gnu, ARM64 uses /usr/lib/aarch64-linux-gnu
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        LIB_PATH="/usr/lib/x86_64-linux-gnu"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        LIB_PATH="/usr/lib/aarch64-linux-gnu"; \
    else \
        LIB_PATH="/usr/lib"; \
    fi && \
    echo "LD_LIBRARY_PATH=$LIB_PATH:\$LD_LIBRARY_PATH" >> /etc/environment
ENV LD_LIBRARY_PATH="/usr/lib"

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
