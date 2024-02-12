import { Method } from 'axios';
import { url } from '../utils/utils';
import { UserCredentials, ExtractParams, UploadParams } from '../types';
import { apiCall } from './ApiUtility';

// const uploadAPI = async (file: any, userCredentials: any) => {
//   console.log('check URL', url());
//   try {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('uri', userCredentials?.uri);
//     formData.append('userName', userCredentials?.userName);
//     formData.append('password', userCredentials?.password);
//     const response = await axios.post(`${url()}sources`, formData, {
//       headers: {
//         'Content-Type': 'multipart/form-data',
//       },
//     });
//     return response;
//   } catch (error) {
//     console.log('Error uploading file:', error);
//     throw error;
//   }
// };

// export { uploadAPI };


export const uploadAPI = async (file: any, userCredentials: any): Promise<any> => {
  const urlUpload = `${url()}sources`;
  const method: Method = 'post';
  const commonParams: UserCredentials =  userCredentials ;
  const additionalParams: UploadParams = { file };
  return await apiCall(urlUpload, method, commonParams, additionalParams)
}

export const extractAPI = async (file: any, model: string, userCredentials: any): Promise<any> => {
  const urlExtract = `${url()}extract`;
  const method: Method = 'post';
  const commonParams: UserCredentials = userCredentials;
  const additionalParams: ExtractParams = { file, model };
  return await apiCall(urlExtract, method, commonParams, additionalParams)
}