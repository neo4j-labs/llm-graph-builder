import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials, commonserverresponse } from '../types';

const cancelAPI = async (filenames: string[], source_types: string[]) => {
  try {
    const formData = new FormData();
    const credentials: UserCredentials = JSON.parse(localStorage.getItem('neo4j.connection') || 'null');
    if (credentials) {
      formData.append('uri', credentials?.uri ?? '');
      formData.append('database', credentials?.database ?? '');
      formData.append('userName', credentials?.user ?? '');
      formData.append('password', credentials?.password ?? '');
    }
    formData.append('filenames', JSON.stringify(filenames));
    formData.append('source_types', JSON.stringify(source_types));
    const response = await axios.post<commonserverresponse>(`${url()}/cancelled_job`, formData);
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default cancelAPI;
