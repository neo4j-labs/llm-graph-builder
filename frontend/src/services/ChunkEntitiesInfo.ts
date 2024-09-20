import { ChatInfo_APIResponse, UserCredentials } from '../types';
import api from '../API/Index';

const chunkEntitiesAPI = async (
  userCredentials: UserCredentials,
  chunk_ids: string,
  database: string = 'neo4j',
  is_entity: boolean = false
) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('chunk_ids', chunk_ids);
    formData.append('database', database);
    formData.append('is_entity', String(is_entity));

    const response: ChatInfo_APIResponse = await api.post(`/chunk_entities`, formData, {
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
