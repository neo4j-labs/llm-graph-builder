import { duplicateNodesData } from '../types';
import api from '../API/Index';

export const getDuplicateNodes = async (signal: AbortSignal) => {
  const formData = new FormData();
  try {
    const response = await api.post<duplicateNodesData>(`/get_duplicate_nodes`, formData, { signal });
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
