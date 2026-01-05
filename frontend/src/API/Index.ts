import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const api = axios.create({
  baseURL: url(),
  data: {},
});

// Store credentials globally for the interceptor
let globalCredentials: UserCredentials | null = null;

export const createDefaultFormData = (userCredentials: UserCredentials) => {
  // Store credentials for interceptor use
  globalCredentials = { ...userCredentials };

  // Clear existing interceptors to avoid duplicates
  api.interceptors.request.clear();

  // Add interceptor to automatically inject credentials into all requests
  api.interceptors.request.use(
    (config) => {
      if (globalCredentials && config.data instanceof FormData) {
        // Add credentials to FormData if not already present
        if (globalCredentials.uri && !config.data.has('uri')) {
          config.data.append('uri', globalCredentials.uri);
        }
        if (globalCredentials.database && !config.data.has('database')) {
          config.data.append('database', globalCredentials.database);
        }
        if (globalCredentials.userName && !config.data.has('userName')) {
          config.data.append('userName', globalCredentials.userName);
        }
        if (globalCredentials.password && !config.data.has('password')) {
          config.data.append('password', globalCredentials.password);
        }
        if (globalCredentials.email && !config.data.has('email')) {
          config.data.append('email', globalCredentials.email);
        }
      } else if (globalCredentials && !(config.data instanceof FormData)) {
        // Convert plain object to FormData and add credentials
        const formData = new FormData();

        // Add credentials first
        if (globalCredentials.uri) {
          formData.append('uri', globalCredentials.uri);
        }
        if (globalCredentials.database) {
          formData.append('database', globalCredentials.database);
        }
        if (globalCredentials.userName) {
          formData.append('userName', globalCredentials.userName);
        }
        if (globalCredentials.password) {
          formData.append('password', globalCredentials.password);
        }
        if (globalCredentials.email) {
          formData.append('email', globalCredentials.email);
        }

        // Add other data fields
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

  // Return a FormData with credentials for direct use if needed
  return createCredentialsFormData(userCredentials);
};

export const createCredentialsFormData = (userCredentials: UserCredentials): FormData => {
  const formData = new FormData();
  if (userCredentials?.uri) {
    formData.append('uri', userCredentials.uri);
  }
  if (userCredentials?.database) {
    formData.append('database', userCredentials.database);
  }
  if (userCredentials?.userName) {
    formData.append('userName', userCredentials.userName);
  }
  if (userCredentials?.password) {
    formData.append('password', userCredentials.password);
  }
  if (userCredentials?.email) {
    formData.append('email', userCredentials.email);
  }
  return formData;
};

export default api;
