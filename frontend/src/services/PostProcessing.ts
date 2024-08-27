import { UserCredentials } from '../types';
import api from '../API/Index';

const postProcessing = async (userCredentials: UserCredentials, taskParam: string[]) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('tasks', JSON.stringify(taskParam));
    const response = await api.post(`/post_processing`, formData, {
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
