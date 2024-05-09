import os
import logging
from google.cloud import storage
import google.auth 
from langchain_community.document_loaders import GCSFileLoader
from google_auth_oauthlib.flow import InstalledAppFlow
import google_auth_oauthlib.flow
import json

def get_gcs_bucket_files_info(gcs_project_id, gcs_bucket_name, gcs_bucket_folder):
    #credentials = service_account.Credentials.from_service_account_file(os.environ['GOOGLE_CLOUD_KEYFILE'])
    #storage_client = storage.Client(credentials=credentials)
    project_id, creds = gcloud_OAuth_login(gcs_project_id)
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

def gcloud_OAuth_login(gcs_project_id):

  # user json config from google oauth
  # gcs_auth_config_file=""
  # tmp_file_path = f"/tmp/{gcs_auth_config_file.filename}"
  # logging.info(f"tmp_file_path : {tmp_file_path}")
  # with open(tmp_file_path, "wb") as temp_file:
  #   temp_file.write(gcs_auth_config_file.file.read())
    
  # client_secrets_file = '../backend/src/config.json'
  # logging.info(f"gcs_auth_config_file filename = {gcs_auth_config_file.filename}")
  
  GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
  GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
  REDIRECT_URI = 'http://localhost:8000/oauth2callback'
  SCOPES = ['https://www.googleapis.com/auth/devstorage.read_only']
  
  oauth_config = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uris": [REDIRECT_URI],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
     }
  }
  
  # flow = InstalledAppFlow.from_client_secrets_file(
  #     tmp_file_path,
  #     scopes=['https://www.googleapis.com/auth/devstorage.read_only']
  # )
  flow = InstalledAppFlow.from_client_config(oauth_config, scopes=SCOPES)
  # flow = google_auth_oauthlib.flow.Flow.from_client_config(oauth_config, scopes=SCOPES)
  # flow.redirect_uri = REDIRECT_URI
  # authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true')
  # print(f"authorization_url = {authorization_url}")
  # print(f"state = {state}")
  #creds = flow.fetch_token(authorization_response=str(authorization_url))
  flow.redirect_uri=REDIRECT_URI
  creds = flow.run_local_server(port=0)
  print(f"creds = {creds}")
  # auth_url, _ = flow.authorization_url()
  # logging.info(f"auth url = {auth_url}")

  #creds = flow.run_local_server(port=0)
  # creds = flow.run_local_server(port=0)
  # client_file = open(tmp_file_path)
  # data = json.load(client_file)
  # project_id = data['installed']['project_id']
  project_id = "persistent-genai"
  return project_id, creds
       