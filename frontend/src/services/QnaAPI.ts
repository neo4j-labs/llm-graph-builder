import axios from "axios";
import { url } from "../utils/Utils";

const chatBotAPI = async (userCredentials: any, model: string, question: string) => {
    try {
        const formData = new FormData();
        formData.append('uri', userCredentials?.uri ?? '');
        formData.append('database', userCredentials?.database ?? '');
        formData.append('userName', userCredentials?.userName ?? '');
        formData.append('password', userCredentials?.password ?? '');
        formData.append('model', model)
        formData.append('question', question)
        const response: any = await axios.post(`${url()}/chat_bot`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    } catch (error) {
        console.log('Error Posting the Question:', error);
        throw error;
    }
};
export default chatBotAPI;