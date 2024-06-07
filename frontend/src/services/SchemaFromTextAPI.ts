import axios from 'axios';
import { url } from '../utils/Utils';
import { ScehmaFromText, UserCredentials } from '../types';

export const getNodeLabelsAndRelTypesFromText = async (
  userCredentials: UserCredentials,
  model: string,
  inputText: string
) => {
  const formData = new FormData();
  formData.append('uri', userCredentials?.uri ?? '');
  formData.append('database', userCredentials?.database ?? '');
  formData.append('userName', userCredentials?.userName ?? '');
  formData.append('password', userCredentials?.password ?? '');
  formData.append('model', model);
  formData.append('input_text', inputText);
  try {
    const response = await axios.post<ScehmaFromText>(`${url()}/populate_graph_schema`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
