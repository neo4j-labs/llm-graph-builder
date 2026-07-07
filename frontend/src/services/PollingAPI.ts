import { PollingAPI_Response, statusupdate, UserCredentials } from '../types';
import api from '../API/Index';
export default async function subscribe(
  fileName: string,
  userCredentials: UserCredentials,
  datahandler: (i: statusupdate) => void,
  progressHandler: (i: statusupdate) => void
) {
  const MAX_POLLING_ATTEMPTS = 10;
  let pollingAttempts = 0;
  let delay = 1000;
  const formData = new FormData();
  if (userCredentials.uri) {
    formData.append('uri', userCredentials.uri);
  }
  if (userCredentials.userName) {
    formData.append('userName', userCredentials.userName);
  }
  if (userCredentials.password) {
    formData.append('password', userCredentials.password);
  }
  if (userCredentials.database) {
    formData.append('database', userCredentials.database);
  }
  if (userCredentials.email) {
    formData.append('email', userCredentials.email);
  }
  while (pollingAttempts < MAX_POLLING_ATTEMPTS) {
    let currentDelay = delay;
    const response: PollingAPI_Response = await api.post(`/document_status/${fileName}`, formData);
    if (response.data?.file_name?.status === 'Processing') {
      progressHandler(response.data);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
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
