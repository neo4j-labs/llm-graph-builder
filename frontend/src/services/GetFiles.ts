import axios from 'axios';
import { url } from '../utils/Utils';
import { SourceNode, UserCredentials } from '../types';
interface ServerData {
  data:SourceNode[]
  status: string,
  error?:string,
  message?:string
}

export const getSourceNodes = async (userCredentials: UserCredentials) => {
  const encodedstr = btoa(userCredentials.password);
  try {
    const response = await axios.get<ServerData>(
      `${url()}/sources_list?uri=${userCredentials.uri}&database=${userCredentials.database}&userName=${userCredentials.userName
      }&password=${encodedstr}`
    );

    return response;
  } catch (error) {
    throw error;
  }
};
