import { SourceListServerData, UserCredentials } from '../types';
import api from '../API/Index';

export const getSourceNodes = async (userCredentials: UserCredentials) => {
  try {
    const encodedstr = btoa(userCredentials.password);
    const response = await api.get<SourceListServerData>(
      `/sources_list?uri=${userCredentials.uri}&database=${userCredentials.database}&userName=${userCredentials.userName}&password=${encodedstr}`
    );
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
