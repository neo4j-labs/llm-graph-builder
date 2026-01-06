import api from '../API/Index';

const connectAPI = async () => {
  try {
    const formData = new FormData();
    const embeddingModel = localStorage.getItem('embeddingModel') || 'local';
    formData.append('embedding_model', embeddingModel);
    const response = await api.post(`/connect`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error in connecting to the Neo4j instance :', error);
    throw error;
  }
};

const envConnectionAPI = async () => {
  try {
    const conectionUrl = `/backend_connection_configuration`;
    const formData = new FormData();
    const embeddingModel = localStorage.getItem('embeddingModel') || 'local';
    formData.append('embedding_model', embeddingModel);
    const response = await api.post(conectionUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('API Connection error', error);
    throw error;
  }
};

export { connectAPI, envConnectionAPI };
