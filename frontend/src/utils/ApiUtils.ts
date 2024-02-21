import axios, { AxiosResponse, Method } from 'axios';
import { UserCredentials, FormDataParams } from '../types';

//API Call
const apiCall = async (
  url: string,
  method: Method,
  commonParams: UserCredentials,
  additionalParams: FormDataParams
) => {
  try {
    const formData = new FormData();
    for (const key in commonParams) {
      const value = commonParams[key as keyof UserCredentials];
      formData.append(key, value);
    }
    for (const key in additionalParams) {
      const value = additionalParams[key as keyof FormDataParams];
      formData.append(key, value);
    }
    console.log(formData);
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
