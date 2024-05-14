import axios from 'axios';
import { url } from '../utils/Utils';
import { PollingAPI_Response, statusupdate } from '../types';

export default async function subscribe(
  fileName: string,
  uri: string,
  username: string,
  database: string,
  password: string,
  datahandler: (i: statusupdate) => void
) {
  let encodedstr;
  if (password) {
    encodedstr = btoa(password);
  }

  let response: PollingAPI_Response = await axios.get(
    `${url()}/document_status/${fileName}?url=${uri}&userName=${username}&password=${encodedstr}&database=${database}`
  );
  if (response.data?.file_name?.status == 'Processing') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await subscribe(fileName, uri, username, database, password, datahandler);
  } else if (response.status != 200) {
    throw new Error(
      JSON.stringify({ fileName, message: `Failed To Process ${fileName} or LLM Unable To Parse Content` })
    );
  } else {
    datahandler(response.data);
  }
}
