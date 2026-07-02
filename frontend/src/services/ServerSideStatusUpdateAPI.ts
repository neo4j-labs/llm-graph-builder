import { eventResponsetypes, UserCredentials } from '../types';
import { url } from '../utils/Utils';
import { getAuthToken } from '../API/Index';
export async function triggerStatusUpdateAPI(
  name: string,
  userCredentials: UserCredentials,
  datahandler: (i: eventResponsetypes) => void
) {
  const params = new URLSearchParams();
  if (userCredentials.uri) {
    params.append('uri', userCredentials.uri);
  }
  if (userCredentials.database) {
    params.append('database', userCredentials.database);
  }
  if (userCredentials.userName) {
    params.append('userName', userCredentials.userName);
  }
  if (userCredentials.password) {
    params.append('password', btoa(userCredentials.password));
  }
  // EventSource cannot send an Authorization header, so the token goes as a query param
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
