import os
import logging
from google.cloud import storage
from google.oauth2 import service_account
import google.auth 
from langchain_community.document_loaders import GCSFileLoader
from ..main import create_api_response

def get_gcs_bucket_files_info(gcs_bucket_name, gcs_bucket_folder):
    #credentials = service_account.Credentials.from_service_account_file(os.environ['GOOGLE_CLOUD_KEYFILE'])
    #storage_client = storage.Client(credentials=credentials)
    storage_client = storage.Client()
    file_name=''
    try:
      bucket = storage_client.bucket(gcs_bucket_name.strip())
      if bucket.exists():
        blobs = storage_client.list_blobs(gcs_bucket_name.strip(), prefix=gcs_bucket_folder if gcs_bucket_folder else '')
        lst_file_metadata=[]
        for blob in blobs:
          if blob.content_type == 'application/pdf':
            folder_name, file_name = os.path.split(blob.name)
            #file_name = blob.name.split('/')[-1]
            file_size = blob.size
            source_url= blob.media_link
            gcs_bucket = gcs_bucket_name
            lst_file_metadata.append({'fileName':file_name,'fileSize':file_size,'url':source_url, 'gcsBucket': gcs_bucket, 'gcsBucketFolder':folder_name if folder_name else ''}) 
        return lst_file_metadata
      else:
        file_name=''
        job_status = "Failed"
        message=f"{gcs_bucket_name} : Bucket does not exist. Please provide valid GCS bucket name"
        return create_api_response(job_status,message=message)
    except Exception as e:
      job_status = "Failed"
      message="Unable to create source node for gcs bucket files"
      error_message = str(e)
      logging.error(f"Unable to create source node for gcs bucket file {file_name}")
      logging.exception(f'Exception Stack trace: {error_message}')
      return create_api_response(job_status,message=message,error=error_message,file_name=file_name)


def get_documents_from_gcs(gcs_bucket_name, gcs_bucket_folder, gcs_blob_filename):

  if gcs_bucket_folder is not None:
    if gcs_bucket_folder.endswith('/'):
      blob_name = gcs_bucket_folder+gcs_blob_filename
    else:
      blob_name = gcs_bucket_folder+'/'+gcs_blob_filename 
  else:
      blob_name = gcs_blob_filename  
  credentials, project_id = google.auth.default()
  logging.info(f"GCS project_id : {project_id}")   
  loader = GCSFileLoader(project_name=project_id, bucket=gcs_bucket_name, blob=blob_name)
  pages = loader.load()
  file_name = gcs_blob_filename
  file_key = gcs_blob_filename
  return file_name, file_key, pages  
       