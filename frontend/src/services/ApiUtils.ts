import axios, { AxiosResponse, Method } from 'axios';
import { UserCredentials, FormDataParams } from '../types';

// API Call
const apiCall = async (
  url: string,
  method: Method,
  commonParams: UserCredentials,
  additionalParams: FormDataParams
) => {
  try {
    const formData = new FormData();
    for (const key in commonParams) {
      formData.append(key, commonParams[key]);
    }
    for (const key in additionalParams) {
      formData.append(key, additionalParams[key]);
    }
    const response: AxiosResponse = await axios({
      method: method,
      url: url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.log('API Error:', error);
    throw error;
  }
};

export { apiCall };
