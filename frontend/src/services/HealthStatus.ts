import axios from 'axios';
import { url } from '../utils/utils';
const healthStatus = async () => {
    try {
        const response = await axios.get(`${url()}/health`);
        return response
    } catch (error) {
        console.log("API status error", error)
        throw error
    }
}
export {healthStatus}