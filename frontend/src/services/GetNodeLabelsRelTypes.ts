import { ServerData } from '../types';
import api from '../API/Index';

export const getNodeLabelsAndRelTypes = async () => {
  const formData = new FormData();
  try {
    const response = await api.post<ServerData>(`/schema`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
