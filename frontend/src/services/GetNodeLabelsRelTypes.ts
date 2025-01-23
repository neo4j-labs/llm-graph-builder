import { ServerData } from '../types';
import api from '../API/Index';

export const getNodeLabelsAndRelTypes = async () => {
  try {
    const response = await api.post<ServerData>(`/schema`);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
