import { OrphanNodeResponse } from '../types';
import api from '../API/Index';

export const getOrphanNodes = async (signal: AbortSignal) => {
  const formData = new FormData();
  try {
    const response = await api.post<OrphanNodeResponse>(`/get_unconnected_nodes_list`, formData, { signal });
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
