import { commonserverresponse } from '../types';
import api from '../API/Index';

const retry = async (file: string, retryOption: string) => {
  try {
    const formData = new FormData();
    formData.append('file_name', file);
    formData.append('retry_condition', retryOption);
    const response = await api.post<commonserverresponse>(`/retry_processing`, formData);
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default retry;
