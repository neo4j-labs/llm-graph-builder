import logging
import os
import tempfile
from urllib.parse import urlparse

import boto3
from langchain_community.document_loaders import S3DirectoryLoader

from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from .local_file import load_document_content

logger = logging.getLogger(__name__)

def get_s3_files_info(s3_url, aws_access_key_id=None, aws_secret_access_key=None):
    """
    Retrieves information about files in an S3 bucket directory.

    Args:
        s3_url (str): The S3 URL (e.g., s3://bucket/path).
        aws_access_key_id (str, optional): AWS access key ID.
        aws_secret_access_key (str, optional): AWS secret access key.

    Returns:
        list: List of dictionaries with file_key and file_size_bytes.

    Raises:
        Exception: If AWS credentials are invalid or S3 access fails.
    """
    try:
        parsed_url = urlparse(s3_url)
        bucket_name = parsed_url.netloc
        directory = parsed_url.path.lstrip('/')
        try:
            s3 = boto3.client(
                's3',
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key
            )
            response = s3.list_objects_v2(Bucket=bucket_name, Prefix=directory)
        except Exception as exc:
            raise Exception("Invalid AWS credentials") from exc

        files_info = []
        for obj in response.get('Contents', []):
            file_key = obj['Key']
            file_name = os.path.basename(file_key)
            logger.info('file_name : %s  and file key : %s', file_name, file_key)
            file_size = obj['Size']
            if file_key.endswith('/'):
                logger.info("Skipping directory marker in S3 listing: %s", file_key)
                continue
            if file_size == 0:
                logger.info("Skipping empty file in S3 listing: %s", file_key)
                continue
            files_info.append({'file_key': file_key, 'file_size_bytes': file_size})

        return files_info
    except Exception as exc:
        error_message = str(exc)
        logger.error("Error while reading files from s3: %s", error_message)
        raise Exception(error_message) from exc


def get_s3_pdf_content(s3_url, aws_access_key_id=None, aws_secret_access_key=None):
    """
    Loads and splits PDF content from an S3 bucket if the path ends with .pdf.

    Args:
        s3_url (str): The S3 URL to the PDF file.
        aws_access_key_id (str, optional): AWS access key ID.
        aws_secret_access_key (str, optional): AWS secret access key.

    Returns:
        list or None: List of Document objects if PDF, else None.

    Raises:
        Exception: If reading content from S3 fails.
    """
    try:
        parsed_url = urlparse(s3_url)
        bucket_name = parsed_url.netloc
        logger.info('bucket name : %s', bucket_name)
        directory = parsed_url.path.lstrip('/')
        if directory.endswith('.pdf'):
            loader = S3DirectoryLoader(
                bucket_name,
                prefix=directory,
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key
            )
            pages = loader.load_and_split()
            return pages
        return None
    except Exception as exc:
        logger.error("getting error while reading content from s3 files:%s", exc)
        raise Exception(exc) from exc


def download_s3_file(s3_client, bucket, file_key, local_path):
    """
    Downloads a file from S3 to a local path.

    Args:
        s3_client: Boto3 S3 client.
        bucket (str): S3 bucket name.
        file_key (str): S3 file key.
        local_path (str): Local file path to save the file.
    """
    s3_client.download_file(bucket, file_key, local_path)


def get_documents_from_s3(s3_url, aws_access_key_id, aws_secret_access_key):
    """
    Downloads a file from S3, loads its content, and returns the file name and pages.

    Args:
        s3_url (str): The S3 URL to the file.
        aws_access_key_id (str): AWS access key ID.
        aws_secret_access_key (str): AWS secret access key.

    Returns:
        tuple: (file_name, list of Document objects)

    Raises:
        LLMGraphBuilderException: If reading content from S3 fails.
    """
    try:
        parsed_url = urlparse(s3_url)
        bucket = parsed_url.netloc
        file_key = parsed_url.path.lstrip('/')
        file_name = os.path.basename(file_key)
        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key
        )
        response = s3.head_object(Bucket=bucket, Key=file_key)
        file_size = response['ContentLength']

        logger.info(
            'bucket : %s, file_name: %s, file key : %s, file size : %d',
            bucket, file_name, file_key, file_size
        )

        with tempfile.NamedTemporaryFile(delete=True, suffix=os.path.splitext(file_name)[1]) as tmp_file:
            download_s3_file(s3, bucket, file_key, tmp_file.name)
            loader, _ = load_document_content(tmp_file.name)
            pages = loader.load()

        return file_name, pages
    except Exception as exc:
        error_message = str(exc)
        logger.exception('Exception in reading content from S3: %s', error_message)
        raise LLMGraphBuilderException(error_message) from exc