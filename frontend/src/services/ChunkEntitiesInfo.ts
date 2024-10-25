import { ChatInfo_APIResponse, nodeDetailsProps, UserCredentials } from '../types';
import api from '../API/Index';

const chunkEntitiesAPI = async (
  userCredentials: UserCredentials,
  database: string = 'neo4j',
  nodeDetails: nodeDetailsProps,
  entities: string[],
  mode: string
) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('database', database);
    formData.append('nodedetails', JSON.stringify(nodeDetails));
    formData.append('entities', JSON.stringify(entities));
    formData.append('mode', mode);

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
