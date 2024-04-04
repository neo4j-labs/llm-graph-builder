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
    
# Installing gcloud
RUN curl https://dl.google.com/dl/cloudsdk/release/google-cloud-sdk.tar.gz > /tmp/google-cloud-sdk.tar.gz

# Installing the package
RUN mkdir -p /usr/local/gcloud \
  && tar -C /usr/local/gcloud -xvf /tmp/google-cloud-sdk.tar.gz \
  && /usr/local/gcloud/google-cloud-sdk/install.sh

# Adding the package path to local
ENV PATH $PATH:/usr/local/gcloud/google-cloud-sdk/bin

CMD ["uvicorn", "score:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["gcloud", "auth", "application-default", "login", "--quiet"]

