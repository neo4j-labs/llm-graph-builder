import { OrphanNodeResponse } from '../types';
import api from '../API/Index';

export const getOrphanNodes = async () => {
  try {
    const response = await api.post<OrphanNodeResponse>(`/get_unconnected_nodes_list`);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
