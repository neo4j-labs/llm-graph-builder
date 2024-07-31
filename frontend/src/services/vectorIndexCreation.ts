import axios from 'axios';
import { url } from '../utils/Utils';
import { commonserverresponse, UserCredentials } from '../types';

export const createVectorIndex = async (userCredentials: UserCredentials, isVectorIndexExists: boolean) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  formData.append('is_vector_index_recreate', JSON.stringify(isVectorIndexExists));
  try {
    const response = await axios.post<commonserverresponse>(`${url()}/drop_create_vector_index`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
