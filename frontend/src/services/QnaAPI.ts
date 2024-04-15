import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const chatBotAPI = async (userCredentials: UserCredentials, question: string, session_id: string,model:string) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('question', question);
    formData.append('session_id', session_id);
    formData.append('model',model)
    const response = await axios.post(`${url()}/chat_bot`, formData, {
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
export default chatBotAPI;
