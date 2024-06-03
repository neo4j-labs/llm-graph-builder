import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

export const chatBotAPI = async (
  userCredentials: UserCredentials,
  question: string,
  session_id: string,
  model: string
) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('question', question);
    formData.append('session_id', session_id);
    formData.append('model', model);
    const startTime = Date.now();
    const response = await axios.post(`${url()}/chat_bot`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    return { response: response, timeTaken: timeTaken };
  } catch (error) {
    console.log('Error Posting the Question:', error);
    throw error;
  }
};

export const clearChatAPI = async (userCredentials: UserCredentials, session_id: string) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('session_id', session_id);
    const response = await axios.post(`${url()}/clear_chat_bot`, formData, {
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
