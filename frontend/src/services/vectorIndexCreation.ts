import { commonserverresponse } from '../types';
import api from '../API/Index';

export const createVectorIndex = async (isVectorIndexExists: boolean) => {
  const formData = new FormData();
  formData.append('isVectorIndexExist', JSON.stringify(isVectorIndexExists));
  try {
    const response = await api.post<commonserverresponse>(`/drop_create_vector_index`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
