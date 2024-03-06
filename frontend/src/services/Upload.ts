import axios from 'axios';
import { url } from '../utils/Utils';

const uploadAPI = async (file: any, userCredentials: any, model: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uri', userCredentials?.uri);
    formData.append('userName', userCredentials?.userName);
    formData.append('password', userCredentials?.password);
    if (model != undefined) {
      formData.append('model', model);
    }
    const response = await axios.post(`${url()}/sources`, formData, {
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

export { uploadAPI };
