import axios from 'axios';
import { url } from '../utils/Utils';

interface ScanProps {
  urlParam: string;
  userCredentials?: any;
  model?: string;
  accessKey?: string;
  secretKey?: string;
  max_limit?: number;
  query_source?: string;
}

const urlScanAPI = async (props: ScanProps) => {
  try {
    const formData = new FormData();
    formData.append('uri', props?.userCredentials?.uri);
    formData.append('database', props?.userCredentials?.database);
    formData.append('userName', props?.userCredentials?.userName);
    formData.append('password', props?.userCredentials?.password);
    formData.append('source_url', props?.urlParam);
    if (props.model != undefined) {
      formData.append('model', props?.model);
    }
    if (props.accessKey?.length) {
      formData.append('aws_access_key_id', props?.accessKey);
    }
    if (props?.secretKey?.length) {
      formData.append('aws_secret_access_key', props?.secretKey);
    }
    if (props?.query_source?.length) {
      formData.append('query_source', props?.query_source);
    }
    if (props?.max_limit != undefined) {
      formData.append('max_limit', props?.max_limit.toString());
    }

    const response: any = await axios.post(`${url()}/url/scan`, formData, {
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

export { urlScanAPI };
