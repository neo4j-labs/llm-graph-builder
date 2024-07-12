import axios from 'axios';
import { url } from '../utils/Utils';
import { ChatInfo_APIResponse, UserCredentials } from '../types';

const chunkEntitiesAPI = async (userCredentials: UserCredentials, chunk_ids: string) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('chunk_ids', chunk_ids);

    const response: ChatInfo_APIResponse = await axios.post(`${url()}/chunk_entities`, formData, {
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

export { chunkEntitiesAPI };
