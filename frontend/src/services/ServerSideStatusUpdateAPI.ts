import { eventResponsetypes, UserCredentials } from '../types';
import api from '../API/Index';
import { url } from '../utils/Utils';

export async function triggerStatusUpdateAPI(
  name: string,
  userCredentials: UserCredentials,
  datahandler: (i: eventResponsetypes) => void
) {
  try {
    // Step 1: Exchange credentials for a short-lived token.
    // Credentials are sent securely in the POST body (never in the URL).
    const tokenResponse = await api.post<{ status: string; data?: { token: string } }>(
      '/get_extract_status_token',
      new FormData()
    );

    if (tokenResponse.data?.status !== 'Success' || !tokenResponse.data?.data?.token) {
      throw new Error('Failed to obtain status token');
    }

    const {token} = tokenResponse.data.data;

    // Step 2: Open the SSE stream using only the opaque token — no credentials in the URL.
    const eventSource = new EventSource(`${url()}/update_extract_status/${encodeURIComponent(name)}?token=${token}`);

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

    eventSource.onerror = () => {
      eventSource.close();
    };
  } catch (error) {
    console.error('triggerStatusUpdateAPI error:', error);
  }
}
