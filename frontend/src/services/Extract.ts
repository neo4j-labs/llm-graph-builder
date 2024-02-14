import axios from 'axios';
import { url } from '../utils/utils';

const extractAPI = async (file: any, model: string, userCredentials?: any,) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    formData.append('uri', userCredentials?.uri);
    formData.append('userName', userCredentials?.userName);
    formData.append('password', userCredentials?.password);
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
