import axios from 'axios';
import { url } from '../utils/Utils';

const api = axios.create({
  baseURL: url(),
});
export default api;
