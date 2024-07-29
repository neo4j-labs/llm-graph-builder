import { Method } from 'axios';
import { url } from './Utils';
import { UserCredentials, ExtractParams, UploadParams } from '../types';
import { apiCall } from '../services/CommonAPI';

// Upload Call
export const uploadAPI = async (
  file: Blob,
  userCredentials: UserCredentials,
  model: string,
  chunkNumber: number,
  totalChunks: number,
  originalname: string
): Promise<any> => {
  const urlUpload = `${url()}/upload`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  const additionalParams: UploadParams = { file, model, chunkNumber, totalChunks, originalname };
  const response = await apiCall(urlUpload, method, commonParams, additionalParams);
  return response;
};

// Extract call
export const extractAPI = async (
  model: string,
  userCredentials: UserCredentials,
  source_type: string,
  source_url?: string,
  aws_access_key_id?: string | null,
  aws_secret_access_key?: string | null,
  file_name?: string,
  gcs_bucket_name?: string,
  gcs_bucket_folder?: string,
  allowedNodes?: string[],
  allowedRelationship?: string[],
  gcs_project_id?: string,
  language?: string,
  access_token?: string
): Promise<any> => {
  const urlExtract = `${url()}/extract`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  let additionalParams: ExtractParams;
  if (source_type === 's3 bucket') {
    additionalParams = {
      model,
      source_url,
      aws_secret_access_key,
      aws_access_key_id,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
    };
  } else if (source_type === 'Wikipedia') {
    additionalParams = {
      model,
      wiki_query: file_name,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
      language,
    };
  } else if (source_type === 'gcs bucket') {
    additionalParams = {
      model,
      gcs_blob_filename: file_name,
      gcs_bucket_folder,
      gcs_bucket_name,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
      gcs_project_id,
      access_token,
    };
  } else if (source_type === 'youtube') {
    additionalParams = {
      model,
      source_url,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
    };
  } else if (source_type === 'web-url') {
    additionalParams = {
      model,
      source_url,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
    };
  } else {
    additionalParams = {
      model,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
    };
  }
  const response = await apiCall(urlExtract, method, commonParams, additionalParams);
  return response;
};
