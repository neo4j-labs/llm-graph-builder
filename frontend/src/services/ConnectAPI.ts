import api from '../API/Index';

const connectAPI = async (connectionURI: string, username: string, password: string, database: string) => {
  try {
    const formData = new FormData();
    formData.append('uri', connectionURI ?? '');
    formData.append('database', database ?? '');
    formData.append('userName', username ?? '');
    formData.append('password', password ?? '');
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
    const conectionUrl = `/backend_connection_configuation`;
    const response = await api.post(conectionUrl);
    return response;
  } catch (error) {
    console.log('API Connection error', error);
    throw error;
  }
};

export { connectAPI, envConnectionAPI };
