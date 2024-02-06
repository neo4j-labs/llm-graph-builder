import axios, { AxiosResponse } from 'axios';
import { url } from '../utils/utils';
export const getSourceNodes = async () => {
  try {
    const response = await axios.get(`${url()}sources_list`);
    if (response.status != 200) {
      throw new Error('Some error occurred');
    }

    return response
  } catch (error) {
    return error;
  }
};
