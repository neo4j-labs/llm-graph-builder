FROM python:3.10
WORKDIR /code
ENV PORT 8000
EXPOSE 8000
COPY . /code
RUN apt-get update \
    && apt-get install -y libgl1-mesa-glx cmake \
    && apt-get install -y poppler-utils \
    && apt install -y tesseract-ocr \
    && export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH \
    && pip install --no-cache-dir --upgrade -r /code/requirements.txt
    
# CMD ["uvicorn", "score:app", "--host", "0.0.0.0", "--port", "8000","--workers", "4"]
CMD ["gunicorn", "score:app","--workers","4","--worker-class","uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "300"]

