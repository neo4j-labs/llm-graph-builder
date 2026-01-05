import api, { createCredentialsFormData } from '../API/Index';
import { UserCredentials } from '../types';

const connectAPI = async (userCredentials: UserCredentials) => {
  try {
    const formData = createCredentialsFormData(userCredentials);
    const response = await api.post(`/connect`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error in connecting to the Neo4j instance :', error);
    throw error;
  }
};

const envConnectionAPI = async () => {
  try {
    const conectionUrl = `/backend_connection_configuration`;
    const response = await api.post(conectionUrl);
    return response;
  } catch (error) {
    console.log('API Connection error', error);
    throw error;
  }
};

export { connectAPI, envConnectionAPI };
