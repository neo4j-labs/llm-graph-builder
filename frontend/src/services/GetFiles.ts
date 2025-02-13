import { SourceListServerData, UserCredentials } from '../types';
import api from '../API/Index';
export const getSourceNodes = async (userCredentials: UserCredentials) => {
  try {
    const params = new URLSearchParams();
    if (userCredentials.uri) {
      params.append('uri', userCredentials.uri);
    }
    if (userCredentials.database) {
      params.append('database', userCredentials.database);
    }
    if (userCredentials.userName) {
      params.append('userName', userCredentials.userName);
    }
    if (userCredentials.password) {
      params.append('password', btoa(userCredentials.password));
    }
    if (userCredentials.email) {
      params.append('email', userCredentials.email);
    }
    const response = await api.get<SourceListServerData>(`/sources_list?${params.toString()}`);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};