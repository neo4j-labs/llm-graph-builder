import { Method } from 'axios';
import { url } from '../utils/utils';
import { UserCredentials, ExtractParams, UploadParams } from '../types';
import { apiCall } from './ApiUtils';
export const uploadAPI = async (file: any, userCredentials: any): Promise<any> => {
  const urlUpload = `${url()}/sources`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  const additionalParams: UploadParams = { file };
  const response = await apiCall(urlUpload, method, commonParams, additionalParams);
  return response;
};

export const extractAPI = async (file: any, model: string, userCredentials: any): Promise<any> => {
  const urlExtract = `${url()}/extract`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  const additionalParams: ExtractParams = { file, model };
  const response = await apiCall(urlExtract, method, commonParams, additionalParams);
  return response;
};
