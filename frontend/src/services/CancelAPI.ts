import { commonserverresponse } from '../types';
import api from '../API/Index';

const cancelAPI = async (filenames: string[], source_types: string[]) => {
  try {
    const formData = new FormData();
    formData.append('filenames', JSON.stringify(filenames));
    formData.append('source_types', JSON.stringify(source_types));
    const response = await api.post<commonserverresponse>(`/cancelled_job`, formData);
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default cancelAPI;
