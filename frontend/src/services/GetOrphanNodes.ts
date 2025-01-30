import { OrphanNodeResponse } from '../types';
import api from '../API/Index';

export const getOrphanNodes = async () => {
  const formData = new FormData();
  try {
    const response = await api.post<OrphanNodeResponse>(`/get_unconnected_nodes_list`,formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
