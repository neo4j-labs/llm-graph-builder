import api from '../API/Index';
import { SchemaSpec } from '../types';

export interface SchemaFromTtlResponse {
  status: string;
  data: {
    schemaSpec: SchemaSpec;
    warnings: string[];
  };
  message?: string;
  error?: string;
}

export const getSchemaFromTtl = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<SchemaFromTtlResponse>(`/schema/from_ttl`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response;
};
