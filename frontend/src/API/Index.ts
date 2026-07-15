import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const api = axios.create({
  baseURL: url(),
  data: {},
});

// Store credentials globally for the interceptor
let globalCredentials: UserCredentials | null = null;

// Async getter registered by the Auth0 provider to fetch the current access token
let authTokenGetter: (() => Promise<string>) | null = null;

export const setAuthTokenGetter = (getter: (() => Promise<string>) | null) => {
  authTokenGetter = getter;
};

export const getAuthToken = async (): Promise<string | null> => {
  if (!authTokenGetter) {
    return null;
  }
  try {
    return await authTokenGetter();
  } catch (error) {
    console.error('Unable to acquire access token', error);
    return null;
  }
};

// Single interceptor registered once so the bearer token and credentials apply to every request
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
        config.data.append('password', btoa(globalCredentials.password));
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
        formData.append('password', btoa(globalCredentials.password));
      }

      // Add other data fields
      for (const [key, value] of Object.entries(config.data || {})) {
        if (key === 'password') {
          formData.append(key, btoa(value as string));
        } else {
          formData.append(key, value as any);
        }
      }

      config.data = formData;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const createDefaultFormData = (userCredentials: UserCredentials) => {
  // Store credentials for interceptor use
  globalCredentials = { ...userCredentials };

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
    formData.append('password', btoa(userCredentials.password));
  }
  return formData;
};

export default api;
