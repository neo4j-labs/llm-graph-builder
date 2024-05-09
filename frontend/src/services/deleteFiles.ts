import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const deleteAPI = async (
  userCredentials: UserCredentials,
  selectedFiles: Record<string, boolean>,
  deleteEntities: boolean
) => {
  try {
    const keys = Object.keys(selectedFiles);
    const filenames = keys.map((str) => str.split(',')[0]);
    const source_types = keys.map((str) => str.split(',')[1]);
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    // @ts-ignore
    formData.append('deleteEntities', deleteEntities);
    // @ts-ignore
    formData.append('filenames', filenames);
    // @ts-ignore
    formData.append('source_types', source_types);
    const response = await axios.post(`${url()}/delete_document_and_entities`, formData);
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default deleteAPI;
