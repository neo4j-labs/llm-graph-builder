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
export { healthStatus };
