import { Method } from 'axios';
import { url } from '../utils/utils';
import { UserCredentials, ExtractParams, UploadParams } from '../types';
import { apiCall } from '../utils/ApiUtils';
export const uploadAPI = async (file: any, userCredentials: any): Promise<any> => {
  const urlUpload = `${url()}/sources`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  const additionalParams: UploadParams = { file };
  const response = await apiCall(urlUpload, method, commonParams, additionalParams);
  return response;
};

export const extractAPI = async (
  file: any,
  model: string,
  userCredentials: any,
  source_url?: any,
  aws_access_key_id?: any,
  aws_secret_access_key?: any
): Promise<any> => {
  const urlExtract = `${url()}/extract`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  let additionalParams: ExtractParams;
  if (source_url?.length) {
    additionalParams = { model, source_url, aws_secret_access_key, aws_access_key_id };
  } else {
    additionalParams = { file, model };
  }
  const response = await apiCall(urlExtract, method, commonParams, additionalParams);
  return response;
};
