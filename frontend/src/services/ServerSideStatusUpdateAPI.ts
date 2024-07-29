import { eventResponsetypes } from '../types';
import { url } from '../utils/Utils';

export function triggerStatusUpdateAPI(
  name: string,
  uri: string,
  username: string,
  password: string,
  database: string,
  datahandler: (i: eventResponsetypes) => void,
  onStatusComplete: () => void
) {
  let encodedPassword = '';
  if (password) {
    encodedPassword = btoa(password);
  }
  const eventSource = new EventSource(
    `${url()}/update_extract_status/${encodeURIComponent(name)}?url=${encodeURIComponent(uri)}&userName=${encodeURIComponent(username)}&password=${encodeURIComponent(encodedPassword)}&database=${encodeURIComponent(database)}`
  );
  eventSource.onmessage = (event) => {
    const eventResponse: eventResponsetypes = JSON.parse(event.data);
    datahandler(eventResponse);
    if (
      eventResponse.status === 'Completed' ||
      eventResponse.status === 'Failed' ||
      eventResponse.status === 'Cancelled'
    ) {
      eventSource.close();
      onStatusComplete();
    }
  };
  eventSource.onerror = (error) => {
    console.error('EventSource failed: ', error);
    eventSource.close();
  };
}
