import axios from 'axios';
import { url } from '../utils/Utils';
import { PollingAPI_Response, statusupdate } from '../types';

export default async function subscribe(
  fileName: string,
  uri: string,
  username: string,
  database: string,
  password: string,
  datahandler: (i: statusupdate) => void,
  progressHandler: (i: statusupdate) => void
) {
  let encodedstr = password ? btoa(password) : '';

  const MAX_POLLING_ATTEMPTS = 10;
  let pollingAttempts = 0;
  let delay = 2000;

  while (pollingAttempts < MAX_POLLING_ATTEMPTS) {
    let currentdelay = delay;
    let response: PollingAPI_Response = await axios.get(
      `${url()}/document_status/${fileName}?url=${uri}&userName=${username}&password=${encodedstr}&database=${database}`
    );

    if (response.data?.file_name?.status === 'Processing') {
      progressHandler(response.data);
      await new Promise((resolve) => {
        setTimeout(resolve, currentdelay);
      });
      delay *= 2;
      pollingAttempts++;
    } else if (response.status !== 200) {
      throw new Error(
        JSON.stringify({ fileName, message: `Failed To Process ${fileName} or LLM Unable To Parse Content` })
      );
    } else {
      datahandler(response.data);
      return;
    }
  }

  throw new Error(`Polling for ${fileName} timed out after ${MAX_POLLING_ATTEMPTS} attempts.`);
}
