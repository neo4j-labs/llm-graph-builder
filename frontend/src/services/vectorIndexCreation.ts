import axios from 'axios';
import { url } from '../utils/Utils';
import { commonserverresponse, UserCredentials } from '../types';

export const createVectorIndex = async (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  try {
    const response = await axios.post<commonserverresponse>(`${url()}/drop_create_vector_index`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
