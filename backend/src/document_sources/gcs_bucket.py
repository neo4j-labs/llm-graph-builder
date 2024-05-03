import os
import logging
from google.cloud import storage
import google.auth 
from langchain_community.document_loaders import GCSFileLoader
from google_auth_oauthlib.flow import InstalledAppFlow
import json

def get_gcs_bucket_files_info(gcs_auth_config_file, gcs_bucket_name, gcs_bucket_folder):
    #credentials = service_account.Credentials.from_service_account_file(os.environ['GOOGLE_CLOUD_KEYFILE'])
    #storage_client = storage.Client(credentials=credentials)
    project_id, creds = gcloud_OAuth_login(gcs_auth_config_file)
    storage_client = storage.Client(project=project_id, credentials=creds)
    file_name=''
    try:
      bucket = storage_client.bucket(gcs_bucket_name.strip())
      if bucket.exists():
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
                                      'gcsProjectId': project_id}) 
        return lst_file_metadata
      else:
        file_name=''
        message=f"{gcs_bucket_name} : Bucket does not exist. Please provide valid GCS bucket name"
        raise Exception(message)
    except Exception as e:
      error_message = str(e)
      logging.error(f"Unable to create source node for gcs bucket file {file_name}")
      logging.exception(f'Exception Stack trace: {error_message}')
      raise Exception(error_message)


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
  loader = GCSFileLoader(project_name=gcs_project_id, bucket=gcs_bucket_name, blob=blob_name)
  pages = loader.load()
  file_name = gcs_blob_filename
  return file_name, pages  

def gcloud_OAuth_login(gcs_auth_config_file):

  # user json config from google oauth
  tmp_file_path = f"/tmp/{gcs_auth_config_file.filename}"
  logging.info(f"tmp_file_path : {tmp_file_path}")
  with open(tmp_file_path, "wb") as temp_file:
    temp_file.write(gcs_auth_config_file.file.read())
    
  client_secrets_file = '../backend/src/config.json'
  logging.info(f"gcs_auth_config_file filename = {gcs_auth_config_file.filename}")
  flow = InstalledAppFlow.from_client_secrets_file(
      tmp_file_path,
      scopes=['https://www.googleapis.com/auth/devstorage.read_only']
  )
  # auth_url, _ = flow.authorization_url()
  # logging.info(f"auth url = {auth_url}")

  #creds = flow.run_local_server(port=0)
  creds = flow.run_local_server(port=0)
  client_file = open(tmp_file_path)
  data = json.load(client_file)
  project_id = data['installed']['project_id']
  return project_id, creds
       