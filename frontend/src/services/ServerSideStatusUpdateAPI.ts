import { eventResponsetypes } from '../types';
import { url } from '../utils/Utils';
export function triggerStatusUpdateAPI(
  name: string,
  uri: string,
  username: string,
  password: string,
  database: string,
  datahandler: (i: eventResponsetypes) => void
) {
  let encodedstr;
  if (password) {
    encodedstr = btoa(password);
  }
  const eventSource = new EventSource(
    `${url()}/update_extract_status/${name}?url=${uri}&userName=${username}&password=${encodedstr}&database=${database}`
  );
  eventSource.onmessage = (event) => {
    const eventResponse = JSON.parse(event.data);
    if (
      eventResponse.status === 'Completed' ||
      eventResponse.status == 'Failed' ||
      eventResponse.status == 'Cancelled'
    ) {
      datahandler(eventResponse);
      eventSource.close();
    } else {
      datahandler(eventResponse);
    }
  };
}
