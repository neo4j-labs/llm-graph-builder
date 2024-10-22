import { MetricsResponse } from '../types';
import api from '../API/Index';

export const getChatMetrics = async (
  question: string,
  context: string[],
  answer: string[],
  model: string,
  mode: string[]
) => {
  const formData = new FormData();
  formData.append('question', question);
  formData.append('context', JSON.stringify(context));
  formData.append('answer', JSON.stringify(answer));
  formData.append('model', model);
  formData.append('mode', JSON.stringify(mode));
  try {
    const response = await api.post<MetricsResponse>(`/metric`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
