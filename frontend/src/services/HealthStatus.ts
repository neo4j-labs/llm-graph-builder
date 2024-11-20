import api from '../API/Index';

const healthStatus = async () => {
  try {
    const healthUrl = `/health`;
    const response = await api.get(healthUrl);
    return response;
  } catch (error) {
    console.log('API status error', error);
    throw error;
  }
};

const connectionStatusAPI = async () => {
  try {
    const conectionUrl = `/backend_connection_configuation`;
    const response = await api.post(conectionUrl);
    return response;
  } catch (error) {
    console.log('API Connection error', error);
    throw error;
  }
};

export { healthStatus, connectionStatusAPI };
