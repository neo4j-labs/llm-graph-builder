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

export const extractAPI = async (file: any, model: string, userCredentials: any, s3_url?: any): Promise<any> => {
  const urlExtract = `${url()}/extract`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  let additionalParams: ExtractParams;
  if (s3_url?.length) {
    additionalParams = { model, s3_url };
  } else {
    additionalParams = { file, model };
  }
  const response = await apiCall(urlExtract, method, commonParams, additionalParams);
  return response;
};
