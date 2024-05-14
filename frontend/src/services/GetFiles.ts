import axios from 'axios';
import { url } from '../utils/Utils';
import { SourceListServerData, UserCredentials } from '../types';

export const getSourceNodes = async (userCredentials: UserCredentials) => {
  try {
    const encodedstr = btoa(userCredentials.password);
    const response = await axios.get<SourceListServerData>(
      `${url()}/sources_list?uri=${userCredentials.uri}&database=${userCredentials.database}&userName=${
        userCredentials.userName
      }&password=${encodedstr}`
    );
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
