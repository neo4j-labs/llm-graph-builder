import { AxiosResponse, Method } from 'axios';
import { UserCredentials, FormDataParams } from '../types';
import api from '../API/Index';

// API Call
const apiCall = async (
  url: string,
  method: Method,
  commonParams: UserCredentials,
  additionalParams: Partial<FormDataParams>
) => {
  try {
    const formData = new FormData();
    for (const key in commonParams) {
      formData.append(key, commonParams[key]);
    }
    for (const key in additionalParams) {
      formData.append(key, additionalParams[key]);
    }
    const response: AxiosResponse = await api({
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
