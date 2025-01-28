import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const api = axios.create({
  baseURL: url(),
  data: {},
});

export const createDefaultFormData = (userCredentials: UserCredentials) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  formData.append('email', userCredentials?.email ?? '');
  api.interceptors.request.use(
    (config) => {
      if (config.data instanceof FormData) {
        for (const [key, value] of formData.entries()) {
          if (!config.data.has(key)) {
            config.data.append(key, value);
          }
        }
      } else {
        const formData = new FormData();
        for (const [key, value] of formData.entries()) {
          formData.append(key, value);
        }
        for (const [key, value] of Object.entries(config.data || {})) {
          formData.append(key, value as any);
        }
        config.data = formData;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  return formData;
};

export default api;
