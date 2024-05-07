import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const graphQueryAPI = async (
  userCredentials: UserCredentials,
  query_type: string,
  document_name: string,
  doc_limit: string
) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('query_type', query_type ?? 'entities');
    formData.append('document_name', document_name);
    formData.append('doc_limit', doc_limit);
    const response = await axios.post(`${url()}/graph_query`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default graphQueryAPI;
