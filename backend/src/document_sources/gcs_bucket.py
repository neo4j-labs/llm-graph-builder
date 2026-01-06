import os
import logging
import io
import time
from google.cloud import storage
from langchain_community.document_loaders import GCSFileLoader
from langchain_core.documents import Document
from PyPDF2 import PdfReader
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from google.oauth2.credentials import Credentials
import nltk
from .local_file import load_document_content

logger = logging.getLogger(__name__)

def get_nltk_download_dir():
    """
    Returns a directory for NLTK data that is writable by the current user.
    Prefers /usr/local/nltk_data if writable, else falls back to ~/.nltk_data.
    """
    system_dir = "/usr/local/nltk_data"
    user_dir = os.path.expanduser("~/.nltk_data")
    if os.access(system_dir, os.W_OK):
        return system_dir
    return user_dir

def ensure_nltk_resources():
    """
    Ensures required NLTK resources are available, downloading if necessary.
    """
    download_dir = get_nltk_download_dir()
    if download_dir not in nltk.data.path:
        nltk.data.path.append(download_dir)
    resources = [
        ("punkt", "tokenizers"),
        ("averaged_perceptron_tagger", "taggers"),
    ]
    for res, res_type in resources:
        try:
            nltk.data.find(f"{res_type}/{res}")
        except LookupError:
            logger.info("NLTK resource '%s' not found; downloading to %s", res, download_dir)
            nltk.download(res, download_dir=download_dir)

def get_gcs_bucket_files_info(gcs_project_id, gcs_bucket_name, gcs_bucket_folder, creds):
    """
    Retrieves metadata for files in a GCS bucket folder.

    Args:
        gcs_project_id (str): GCP project ID.
        gcs_bucket_name (str): GCS bucket name.
        gcs_bucket_folder (str): Folder path in the bucket.
        creds: Google credentials object.

    Returns:
        list: List of file metadata dictionaries.

    Raises:
        LLMGraphBuilderException: If the bucket does not exist or access fails.
    """
    storage_client = storage.Client(project=gcs_project_id, credentials=creds)
    file_name = ''
    try:
        bucket = storage_client.bucket(gcs_bucket_name.strip())
        buckets_list = [bkt.name for bkt in storage_client.list_buckets()]
        if bucket.name in buckets_list:
            blobs = storage_client.list_blobs(gcs_bucket_name.strip(), prefix=gcs_bucket_folder if gcs_bucket_folder else '')
            lst_file_metadata = []
            for blob in blobs:
                folder_name, file_name = os.path.split(blob.name)
                file_size = blob.size
                source_url = blob.media_link
                gcs_bucket = gcs_bucket_name
                file_ext = os.path.splitext(file_name)[1].lstrip('.').lower()
                if file_size == 0 or blob.name.endswith('/'):
                    continue
                lst_file_metadata.append({
                    'fileName': file_name,
                    'fileSize': file_size,
                    'url': source_url,
                    'gcsBucket': gcs_bucket,
                    'gcsBucketFolder': folder_name if folder_name else '',
                    'gcsProjectId': gcs_project_id,
                    'fileExtension': file_ext
                })
            return lst_file_metadata
        message = f" Bucket:{gcs_bucket_name} does not exist in Project:{gcs_project_id}. Please provide valid GCS bucket name"
        logger.info("Bucket : %s does not exist in project : %s", gcs_bucket_name, gcs_project_id)
        raise LLMGraphBuilderException(message)
    except Exception as exc:
        error_message = str(exc)
        logger.error("Unable to create source node for gcs bucket file %s", file_name)
        logger.exception('Exception Stack trace: %s', error_message)
        raise LLMGraphBuilderException(error_message) from exc

def gcs_loader_func(file_path):
    """
    Loader function for GCS files using local_file utilities.

    Args:
        file_path (str): Path to the file.

    Returns:
        loader: Document loader instance.
    """
    loader, _ = load_document_content(file_path)
    return loader

def get_documents_from_gcs(gcs_project_id, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename, access_token=None):
    """
    Loads documents from a GCS bucket, handling both public and token-based access.

    Args:
        gcs_project_id (str): GCP project ID.
        gcs_bucket_name (str): GCS bucket name.
        gcs_bucket_folder (str): Folder path in the bucket.
        gcs_blob_filename (str): File name in the bucket.
        access_token (str, optional): OAuth2 access token.

    Returns:
        tuple: (gcs_blob_filename, list of Document objects)

    Raises:
        LLMGraphBuilderException: If file does not exist or loading fails.
    """
    ensure_nltk_resources()

    if gcs_bucket_folder and gcs_bucket_folder.strip():
        blob_name = f"{gcs_bucket_folder.rstrip('/')}/{gcs_blob_filename}"
    else:
        blob_name = gcs_blob_filename

    logger.info("GCS project_id : %s", gcs_project_id)

    try:
        if access_token is None:
            storage_client = storage.Client(project=gcs_project_id)
            bucket = storage_client.bucket(gcs_bucket_name)
            blob = bucket.blob(blob_name)
            if blob.exists():
                loader = GCSFileLoader(
                    project_name=gcs_project_id,
                    bucket=gcs_bucket_name,
                    blob=blob_name,
                    loader_func=gcs_loader_func
                )
                pages = loader.load()
            else:
                raise LLMGraphBuilderException('File does not exist, Please re-upload the file and try again.')
        else:
            creds = Credentials(access_token)
            storage_client = storage.Client(project=gcs_project_id, credentials=creds)
            bucket = storage_client.bucket(gcs_bucket_name)
            blob = bucket.blob(blob_name)
            if blob.exists():
                content = blob.download_as_bytes()
                pdf_file = io.BytesIO(content)
                pdf_reader = PdfReader(pdf_file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() or ""
                pages = [Document(page_content=text)]
            else:
                raise LLMGraphBuilderException(f'File Not Found in GCS bucket - {gcs_bucket_name}')
        return gcs_blob_filename, pages
    except Exception as exc:
        raise LLMGraphBuilderException(str(exc)) from exc

def upload_file_to_gcs(file_chunk, chunk_number, file_name, bucket_name, folder_name_sha1_hashed):
    """
    Uploads a file chunk to a GCS bucket.

    Args:
        file_chunk: File-like object containing the chunk.
        chunk_number (int): Chunk number.
        file_name (str): Original file name.
        bucket_name (str): GCS bucket name.
        folder_name_sha1_hashed (str): Hashed folder name in GCS.

    Raises:
        Exception: If upload fails.
    """
    try:
        storage_client = storage.Client()
        file_name = f'{file_name}_part_{chunk_number}'
        bucket = storage_client.bucket(bucket_name)
        file_data = file_chunk.file.read()
        file_name_with_hashed_folder = f"{folder_name_sha1_hashed}/{file_name}"
        logger.info('GCS folder path in upload: %s', file_name_with_hashed_folder)
        blob = bucket.blob(file_name_with_hashed_folder)
        file_io = io.BytesIO(file_data)
        blob.upload_from_file(file_io)
        time.sleep(1)
        logger.info('Chunk uploaded successfully in gcs')
    except Exception as exc:
        raise Exception('Error in while uploading the file chunks on GCS') from exc

def merge_file_gcs(bucket_name, file_name: str, folder_name_sha1_hashed, total_chunks):
    """
    Merges file chunks in a GCS bucket into a single file.

    Args:
        bucket_name (str): GCS bucket name.
        original_file_name (str): Original file name.
        folder_name_sha1_hashed (str): Hashed folder name in GCS.
        total_chunks (int): Total number of chunks.

    Returns:
        int: Size of the merged file in bytes.

    Raises:
        Exception: If merge fails.
    """
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        chunks = []
        for i in range(1, total_chunks + 1):
            blob_name = f"{folder_name_sha1_hashed}/{file_name}_part_{i}"
            blob = bucket.blob(blob_name)
            if blob.exists():
                logger.info('Blob Name: %s', blob.name)
                chunks.append(blob.download_as_bytes())
                blob.delete()
        merged_file = b"".join(chunks)
        file_name_with_hashed_folder = f"{folder_name_sha1_hashed}/{file_name}"
        logger.info('GCS folder path in merge: %s', file_name_with_hashed_folder)
        blob = storage_client.bucket(bucket_name).blob(file_name_with_hashed_folder)
        logger.info('save the merged file from chunks in gcs')
        file_io = io.BytesIO(merged_file)
        blob.upload_from_file(file_io)
        file_size = len(merged_file)
        return file_size
    except Exception as exc:
        raise Exception('Error in while merge the files chunks on GCS') from exc

def delete_file_from_gcs(bucket_name, folder_name, file_name):
    """
    Deletes a file from a GCS bucket.

    Args:
        bucket_name (str): GCS bucket name.
        folder_name (str): Folder name in GCS.
        file_name (str): File name to delete.

    Raises:
        Exception: If deletion fails.
    """
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        folder_file_name = f"{folder_name}/{file_name}"
        blob = bucket.blob(folder_file_name)
        if blob.exists():
            blob.delete()
        logger.info('File deleted from GCS successfully')
    except Exception as exc:
        raise Exception(exc) from exc

def copy_failed_file(source_bucket_name, dest_bucket_name, folder_name, file_name):
    """
    Copies a failed file from one GCS bucket to another.

    Args:
        source_bucket_name (str): Source GCS bucket name.
        dest_bucket_name (str): Destination GCS bucket name.
        folder_name (str): Folder name in GCS.
        file_name (str): File name to copy.

    Raises:
        Exception: If copy fails.
    """
    try:
        storage_client = storage.Client()
        source_bucket = storage_client.bucket(source_bucket_name)
        dest_bucket = storage_client.bucket(dest_bucket_name)
        folder_file_name = f"{folder_name}/{file_name}"
        source_blob = source_bucket.blob(folder_file_name)
        if source_blob.exists():
            source_bucket.copy_blob(source_blob, dest_bucket, file_name)
            logger.info(
                'Failed file %s copied to %s from %s in GCS successfully',
                file_name, dest_bucket_name, source_bucket_name
            )
    except Exception as exc:
        raise Exception(exc) from exc
