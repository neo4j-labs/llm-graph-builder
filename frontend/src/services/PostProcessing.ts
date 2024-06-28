import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const postProcessing = async (userCredentials: UserCredentials, taskParam: string[]) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('tasks', JSON.stringify(taskParam));
    const response = await axios.post(`${url()}/post_processing`, formData, {
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

export { postProcessing };
