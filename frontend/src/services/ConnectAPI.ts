import axios from 'axios';
import { url } from '../utils/Utils';

const connectAPI = async (connectionURI: string, username: string, password: string, database: string) => {
  try {
    const formData = new FormData();
    formData.append('uri', connectionURI ?? '');
    formData.append('database', database ?? '');
    formData.append('userName', username ?? '');
    formData.append('password', password ?? '');
    const response = await axios.post(`${url()}/connect`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error in connecting to the Neo4j instance :', error);
    throw error;
  }
};
export default connectAPI;
