import { UserCredentials } from '../types';
import api from '../API/Index';

const deleteOrphanAPI = async (userCredentials: UserCredentials, selectedNodes: string[]) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('unconnected_entities_list', JSON.stringify(selectedNodes));
    const response = await api.post(`/delete_unconnected_nodes`, formData);
    return response;
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};
export default deleteOrphanAPI;
