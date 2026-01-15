import { commonserverresponse } from '../types';
import api from '../API/Index';

export const createVectorIndex = async (isVectorIndexExists: boolean) => {
  const formData = new FormData();
  formData.append('isVectorIndexExist', JSON.stringify(isVectorIndexExists));
  const embeddingProvider = localStorage.getItem('embeddingProvider') || 'sentence-transformer';
  const embeddingModel = localStorage.getItem('embeddingModel') || 'all-MiniLM-L6-v2';
  formData.append('embedding_provider', embeddingProvider);
  formData.append('embedding_model', embeddingModel);
  try {
    const response = await api.post<commonserverresponse>(`/drop_create_vector_index`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
