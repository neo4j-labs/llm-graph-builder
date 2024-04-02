import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const updateGraphAPI = async (userCredentials: UserCredentials) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    const response = await axios.post(`${url()}/update_similarity_graph`, userCredentials, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error updating the graph:', error);
    throw error;
  }
};

export { updateGraphAPI };
