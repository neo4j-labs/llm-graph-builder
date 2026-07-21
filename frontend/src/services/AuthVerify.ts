import api from '../API/Index';

// Pre-flight check run before any other startup API call: validates the bearer token
// against the backend (which also warms its token-validation cache).
const verifyAuthAPI = async (): Promise<boolean> => {
  try {
    const response = await api.get('/verify_auth');
    return response?.data?.status === 'Success';
  } catch (error) {
    console.log('Auth verification failed', error);
    return false;
  }
};
export { verifyAuthAPI };
