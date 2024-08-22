import { commonserverresponse, UserCredentials } from '../types';
import api from '../API/Index';

export const createVectorIndex = async (userCredentials: UserCredentials, isVectorIndexExists: boolean) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  formData.append('isVectorIndexExist', JSON.stringify(isVectorIndexExists));
  try {
    const response = await api.post<commonserverresponse>(`/drop_create_vector_index`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
