import axios from 'axios';
import { url } from '../utils/Utils';

export const getSourceNodes = async (userCredentials: any) => {
  try {
    const response = await axios.get(
      `${url()}/sources_list?uri=${userCredentials.uri}&userName=${userCredentials.userName}&password=${
        userCredentials.password
      }`
    );
    if (response.status != 200) {
      throw new Error('Some error occurred');
    }
    return response;
  } catch (error) {
    return error;
  }
};
