import { Method } from 'axios';
import { url } from './Utils';
import { ExtractParams, UploadParams } from '../types';
import { apiCall } from '../services/CommonAPI';

// Upload Call
export const uploadAPI = async (
  file: Blob,
  model: string,
  chunkNumber: number,
  totalChunks: number,
  originalname: string
): Promise<any> => {
  const urlUpload = `${url()}/upload`;
  const method: Method = 'post';
  const additionalParams: UploadParams = { file, model, chunkNumber, totalChunks, originalname };
  const response = await apiCall(urlUpload, method, additionalParams);
  return response;
};

// Extract call
export const extractAPI = async (
  model: string,
  source_type: string,
  retry_condition: string,
  source_url?: string,
  aws_access_key_id?: string | null,
  aws_secret_access_key?: string | null,
  file_name?: string,
  gcs_bucket_name?: string,
  gcs_bucket_folder?: string,
  allowedNodes?: string[],
  allowedRelationship?: string[],
  token_chunk_size?: number,
  chunk_overlap?: number,
  chunks_to_combine?: number,
  gcs_project_id?: string,
  language?: string,
  access_token?: string,
  additional_instructions?: string
): Promise<any> => {
  const urlExtract = `${url()}/extract`;
  const method: Method = 'post';
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
      token_chunk_size,
      chunk_overlap,
      chunks_to_combine,
      retry_condition,
      additional_instructions,
    };
  } else if (source_type === 'Wikipedia') {
    additionalParams = {
      model,
      wiki_query: file_name,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
      token_chunk_size,
      chunk_overlap,
      chunks_to_combine,
      language,
      retry_condition,
      additional_instructions,
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
      token_chunk_size,
      chunk_overlap,
      chunks_to_combine,
      gcs_project_id,
      access_token,
      retry_condition,
      additional_instructions,
    };
  } else if (source_type === 'youtube') {
    additionalParams = {
      model,
      source_url,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
      token_chunk_size,
      chunk_overlap,
      chunks_to_combine,
      retry_condition,
      additional_instructions,
    };
  } else if (source_type === 'web-url') {
    additionalParams = {
      model,
      source_url,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
      token_chunk_size,
      chunk_overlap,
      chunks_to_combine,
      retry_condition,
      additional_instructions,
    };
  } else {
    additionalParams = {
      model,
      source_type,
      file_name,
      allowedNodes,
      allowedRelationship,
      token_chunk_size,
      chunk_overlap,
      chunks_to_combine,
      retry_condition,
      additional_instructions,
    };
  }
  const response = await apiCall(urlExtract, method, additionalParams);
  return response;
};
