import os
import logging
from google.cloud import storage
from langchain_community.document_loaders import GCSFileLoader
from langchain_community.document_loaders import PyMuPDFLoader

def get_gcs_bucket_files_info(gcs_project_id, gcs_bucket_name, gcs_bucket_folder, creds):
    storage_client = storage.Client(project=gcs_project_id, credentials=creds)
    file_name=''
    try:
      bucket = storage_client.bucket(gcs_bucket_name.strip())
      buckets_list = [bkt.name for bkt in storage_client.list_buckets()]
      if bucket.name in buckets_list:
        blobs = storage_client.list_blobs(gcs_bucket_name.strip(), prefix=gcs_bucket_folder if gcs_bucket_folder else '')
        lst_file_metadata=[]
        for blob in blobs:
          if blob.content_type == 'application/pdf':
            folder_name, file_name = os.path.split(blob.name)
            file_size = blob.size
            source_url= blob.media_link
            gcs_bucket = gcs_bucket_name
            lst_file_metadata.append({'fileName':file_name,'fileSize':file_size,'url':source_url, 
                                      'gcsBucket': gcs_bucket, 'gcsBucketFolder':folder_name if folder_name else '',
                                      'gcsProjectId': gcs_project_id}) 
        return lst_file_metadata
      else:
        file_name=''
        message=f" Bucket:{gcs_bucket_name} does not exist in Project:{gcs_project_id}. Please provide valid GCS bucket name"
        logging.info(f"Bucket : {gcs_bucket_name} does not exist in project : {gcs_project_id}")
        raise Exception(message)
    except Exception as e:
      error_message = str(e)
      logging.error(f"Unable to create source node for gcs bucket file {file_name}")
      logging.exception(f'Exception Stack trace: {error_message}')
      raise Exception(error_message)

def load_pdf(file_path):
    return PyMuPDFLoader(file_path)

def get_documents_from_gcs(gcs_project_id, gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename):

  if gcs_bucket_folder is not None:
    if gcs_bucket_folder.endswith('/'):
      blob_name = gcs_bucket_folder+gcs_blob_filename
    else:
      blob_name = gcs_bucket_folder+'/'+gcs_blob_filename 
  else:
      blob_name = gcs_blob_filename  
  #credentials, project_id = google.auth.default()
  logging.info(f"GCS project_id : {gcs_project_id}")  
  loader = GCSFileLoader(project_name=gcs_project_id, bucket=gcs_bucket_name, blob=blob_name, loader_func=load_pdf)
  pages = loader.load()
  file_name = gcs_blob_filename
  return file_name, pages
       