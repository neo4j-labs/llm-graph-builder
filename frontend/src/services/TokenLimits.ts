import api from '../API/Index';
import { UserCredentials } from '../types';

export interface TokenLimitsResponse {
  daily_remaining: number;
  monthly_remaining: number;
  daily_limit: number;
  monthly_limit: number;
  daily_used: number;
  monthly_used: number;
}

export const getTokenLimits = async (userCredentials: UserCredentials): Promise<TokenLimitsResponse | null> => {
  const formData = new FormData();
  if (userCredentials?.uri) {
    formData.append('uri', userCredentials.uri);
  }
  if (userCredentials?.email) {
    formData.append('email', userCredentials.email);
  }

  const response = await api.post(`/get_token_limits`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (response.data.status === 'Success' && response.data.data) {
    return response.data.data;
  }
  return null;
};
