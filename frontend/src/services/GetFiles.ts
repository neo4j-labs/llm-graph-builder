import { SourceListServerData, UserCredentials } from '../types';
import api, { createCredentialsFormData } from '../API/Index';
export const getSourceNodes = async (userCredentials: UserCredentials) => {
  try {
    const formdata = createCredentialsFormData(userCredentials);
    const response = await api.post<SourceListServerData>(`/sources_list`, formdata);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
