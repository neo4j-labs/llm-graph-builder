import { OrphanNodeResponse, UserCredentials } from '../types';
import api from '../API/Index';

export const getOrphanNodes = async (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  try {
    const response = await api.post<OrphanNodeResponse>(`/get_unconnected_nodes_list`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
