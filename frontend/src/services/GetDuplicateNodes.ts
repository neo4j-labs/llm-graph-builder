import { duplicateNodesData, UserCredentials } from '../types';
import api from '../API/Index';

export const getDuplicateNodes = async (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  try {
    const response = await api.post<duplicateNodesData>(`/get_duplicate_nodes`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
