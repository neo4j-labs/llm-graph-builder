import { MetricsResponse } from '../types';
import api from '../API/Index';

export const getChatMetrics = async (question: string, context: string, answer: string, model: string) => {
  const formData = new FormData();
  formData.append('question', question);
  formData.append('context', `[${context}]`);
  formData.append('answer', answer);
  formData.append('model', model);
  try {
    const response = await api.post<MetricsResponse>(`/metric`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
