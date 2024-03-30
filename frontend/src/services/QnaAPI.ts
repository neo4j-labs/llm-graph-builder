import axios from 'axios';
import { url } from '../utils/Utils';

const chatBotAPI = async (userCredentials: any, question: string, session_id: string) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('question', question);
    formData.append('session_id', session_id);
    const response: any = await axios.post(`${url()}/chat_bot`, formData, {
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
