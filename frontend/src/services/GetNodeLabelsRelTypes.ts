import { ServerData, UserCredentials } from '../types';
import api from '../API/Index';

export const getNodeLabelsAndRelTypes = async (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  try {
    const response = await api.post<ServerData>(`/schema`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
