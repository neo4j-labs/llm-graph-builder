import axios from 'axios';
import { url } from '../utils/Utils';
import { ScehmaFromText } from '../types';

export const getNodeLabelsAndRelTypesFromText = async (model: string, inputText: string, isSchemaText: boolean) => {
  const formData = new FormData();
  formData.append('model', model);
  formData.append('input_text', inputText);
  formData.append('is_schema_description_checked', JSON.stringify(isSchemaText));

  try {
    const response = await axios.post<ScehmaFromText>(`${url()}/populate_graph_schema`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
