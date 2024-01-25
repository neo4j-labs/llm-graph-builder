import axios from 'axios';
import { url } from '../utils/utils';

const uploadAPI = async (file: any) => {
    console.log('check URL', url());
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post(`${url()}/extract`, formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        })
        return response;
    } catch (error) {
        console.log("Error uploading file:", error);
        throw error;
    }
}

export { uploadAPI };