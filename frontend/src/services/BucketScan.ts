import axios from 'axios';
import { url } from '../utils/utils';

const bucketScanAPI = async (urlParam: string, userCredentials?: any, accessKey?: string, secretKey?: string) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri);
    formData.append('userName', userCredentials?.userName);
    formData.append('password', userCredentials?.password);
    formData.append('s3_url_dir', urlParam);
    if (accessKey?.length) {
      formData.append('aws_access_key_id', accessKey);
    }
    if (secretKey?.length) {
      formData.append('aws_secret_access_key', secretKey);
    }

    const response = await axios.post(`${url()}/bucket/scan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error uploading file:', error);
    throw error;
  }
};

export { bucketScanAPI };
