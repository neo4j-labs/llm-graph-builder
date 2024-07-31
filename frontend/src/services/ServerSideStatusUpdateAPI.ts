import { Dispatch, SetStateAction } from 'react';
import { eventResponsetypes } from '../types';
import { url } from '../utils/Utils';
export function triggerStatusUpdateAPI(
  name: string,
  uri: string,
  username: string,
  password: string,
  database: string,
  datahandler: (i: eventResponsetypes) => void,
  setProcessedCount: Dispatch<SetStateAction<number>>
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
    datahandler(eventResponse); // Handle the event response
    if (
      eventResponse.status === 'Completed' ||
      eventResponse.status === 'Failed' ||
      eventResponse.status === 'Cancelled'
    ) {
      setProcessedCount((prev) => {
        console.log("Previous count:", prev);
        return prev === 2 ? 0 : prev + 1;
      });
      eventSource.close();
    }
  };
  eventSource.onerror = (error) => {
    console.error('EventSource failed: ', error);
    setProcessedCount((prev) => prev === 2 ? 0 : prev + 1);
  };
}