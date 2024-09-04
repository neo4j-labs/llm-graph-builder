import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials, commonserverresponse } from '../types';

const retry = async (userCredentials: UserCredentials, file: string, retryOption: string) => {
  try {
    const formData = new FormData();

    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');

    formData.append('file_name', file);
    formData.append('retry_condition', retryOption);
    const response = await axios.post<commonserverresponse>(`${url()}/retry_processing`, formData);
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default retry;
