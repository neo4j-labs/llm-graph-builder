import axios from 'axios';
import { url } from '../utils/Utils';
const healthStatus = async () => {
  try {
    const healthUrl = `${url()}/health`;
    const response = await axios.get(healthUrl);
    return response;
  } catch (error) {
    console.log('API status error', error);
    throw error;
  }
};
export { healthStatus };
