import axios from 'axios';
const disconnectAPI = async (connectionClosed: boolean) => {
    try {
        const response = await axios.post('/api/disconnect', { connectionClosed });
        return response.data;
    } catch (error) {
        console.error('Failed to disconnect:', error);
        throw error;
    }
};
export default disconnectAPI;