import api from '../API/Index';

export const graphQueryAPI = async (
  query_type: string,
  document_names: (string | undefined)[] | undefined,
  signal: AbortSignal
) => {
  try {
    const formData = new FormData();
    formData.append('query_type', query_type ?? 'entities');
    formData.append('document_names', JSON.stringify(document_names));

    const response = await api.post(`/graph_query`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    });
    return response;
  } catch (error) {
    console.log('Error getting the Nodes or Relationships:', error);
    throw error;
  }
};

export const getNeighbors = async (elementId: string) => {
  try {
    const formData = new FormData();
    formData.append('elementId', elementId);

    const response = await api.post(`/get_neighbours`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error getting the Neighbors:', error);
    throw error;
  }
};

export const getGraphSchema = async () => {
  try {
    const formData = new FormData();
    const response = await api.post(`/schema_visualization`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error getting the Schema:', error);
    throw error;
  }
};
