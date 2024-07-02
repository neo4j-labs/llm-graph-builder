import axios from 'axios';
import { url } from '../utils/Utils';
import { OrphanNodeResponse, UserCredentials } from '../types';

export const getOrphanNodes = async (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  try {
    const response = await axios.post<OrphanNodeResponse>(`${url()}/get_unconnected_nodes_list`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
