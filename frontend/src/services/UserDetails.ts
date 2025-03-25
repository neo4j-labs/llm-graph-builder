import api from '../API/Index';
import { UserDetailsResponse } from '../types';
export default async function userDetails() {
  try {
    const formData = new FormData();
    const response = await api.post<UserDetailsResponse>('/user_details', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.log();
    throw error;
  }
}
