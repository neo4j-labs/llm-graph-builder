import { SourceListServerData } from '../types';
import api from '../API/Index';
export const getSourceNodes = async () => {
  try {
    const formdata = new FormData();
    const response = await api.post<SourceListServerData>(`/sources_list?`, formdata);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
