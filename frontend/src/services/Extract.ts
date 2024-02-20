import axios from 'axios';
import { url } from '../utils/utils';

const extractAPI = async (file: any, model: string, userCredentials?: any, s3_url?: string) => {
  try {
    const formData = new FormData();
    formData.append('model', model);
    formData.append('uri', userCredentials?.uri);
    formData.append('userName', userCredentials?.userName);
    formData.append('password', userCredentials?.password);
    if (s3_url?.length) {
      formData.append('s3_url', s3_url);
      formData.delete('file');
    } else {
      formData.set('file', file);
    }
    const response = await axios.post(`${url()}/extract`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error uploading file:', error);
    throw error;
  }
};

export { extractAPI };
