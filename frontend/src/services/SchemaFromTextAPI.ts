import { ScehmaFromText } from '../types';
import api from '../API/Index';

export const getNodeLabelsAndRelTypesFromText = async (model: string, inputText: string, isSchemaText: boolean) => {
  const formData = new FormData();
  formData.append('model', model);
  formData.append('input_text', inputText);
  formData.append('is_schema_description_checked', JSON.stringify(isSchemaText));

  try {
    const response = await api.post<ScehmaFromText>(`/populate_graph_schema`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
