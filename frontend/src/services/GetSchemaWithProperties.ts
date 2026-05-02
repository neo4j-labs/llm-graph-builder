import { SchemaWithPropertiesResponse } from '../types';
import api from '../API/Index';

export const getSchemaWithProperties = async () => {
  const formData = new FormData();
  try {
    const response = await api.post<SchemaWithPropertiesResponse>(`/schema_with_properties`, formData);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
