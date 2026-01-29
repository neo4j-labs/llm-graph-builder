import api, { createCredentialsFormData } from '../API/Index';
import { UserCredentials } from '../types';

const fetchEmbeddingModelAPI = async (userCredentials: UserCredentials) => {
  try {
    const formData = createCredentialsFormData(userCredentials);
    const response = await api.post(`/fetch_embedding_model`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error fetching embedding model:', error);
    throw error;
  }
};

export { fetchEmbeddingModelAPI };
