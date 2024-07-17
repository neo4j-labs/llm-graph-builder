import axios from 'axios';
import { url } from '../utils/Utils';
import { duplicateNodesData, UserCredentials } from '../types';

export const getDuplicateNodes = async (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  try {
    const response = await axios.post<duplicateNodesData>(`${url()}/get_duplicate_nodes`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
