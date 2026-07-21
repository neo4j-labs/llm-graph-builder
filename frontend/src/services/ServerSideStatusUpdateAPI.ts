import { eventResponsetypes } from '../types';
import { url } from '../utils/Utils';
import { getAuthToken } from '../API/Index';

export async function triggerStatusUpdateAPI(name: string, datahandler: (i: eventResponsetypes) => void) {
  const params = new URLSearchParams();

  // EventSource cannot send an Authorization header, so the token goes as a query param
  // Credentials are retrieved from server-side session (stored via /connect or /upload)
  const token = await getAuthToken();
  if (token) {
    params.append('access_token', token);
  }

  const queryString = params.toString();
  const requestUrl = queryString
    ? `${url()}/update_extract_status/${name}?${queryString}`
    : `${url()}/update_extract_status/${name}`;

  const eventSource = new EventSource(requestUrl);
  eventSource.onmessage = (event) => {
    const eventResponse = JSON.parse(event.data);
    if (
      eventResponse.status === 'Completed' ||
      eventResponse.status === 'Failed' ||
      eventResponse.status === 'Cancelled'
    ) {
      datahandler(eventResponse);
      eventSource.close();
    } else {
      datahandler(eventResponse);
    }
  };
}
