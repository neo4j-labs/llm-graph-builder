// import { eventResponsetypes } from '../types';
// import { url } from '../utils/Utils';

// export function triggerStatusUpdateAPI(
//   name: string,
//   uri: string,
//   username: string,
//   password: string,
//   database: string,
//   datahandler: (i: eventResponsetypes) => void,
//   onStatusComplete?: () => void
// ) {
//   let encodedPassword = '';
//   if (password) {
//     encodedPassword = btoa(password);
//   }
//   const eventSource = new EventSource(
//     `${url()}/update_extract_status/${encodeURIComponent(name)}?url=${encodeURIComponent(uri)}&userName=${encodeURIComponent(username)}&password=${encodeURIComponent(encodedPassword)}&database=${encodeURIComponent(database)}`
//   );
//   eventSource.onmessage = (event) => {
//     const eventResponse: eventResponsetypes = JSON.parse(event.data);
//     datahandler(eventResponse);
//     if (
//       eventResponse.status === 'Completed' ||
//       eventResponse.status === 'Failed' ||
//       eventResponse.status === 'Cancelled'
//     ) {
//       eventSource.close();
//       if (onStatusComplete)
//         onStatusComplete();
//     }
//   };
//   eventSource.onerror = (error) => {
//     console.error('EventSource failed: ', error);
//     eventSource.close();
//   };
// }

import { eventResponsetypes } from '../types';
import { url } from '../utils/Utils';
export function triggerStatusUpdateAPI(
  name: string,
  uri: string,
  username: string,
  password: string,
  database: string,
  datahandler: (i: eventResponsetypes) => void,
  batchCompleteHandler: () => void // New handler for batch completion
) {
  let encodedstr;
  if (password) {
    encodedstr = btoa(password);
  }
  let completedCount = 0; // Counter for completed, failed, or canceled files
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
      completedCount++;
      // Check if 2 files have completed, failed, or been canceled
      if (completedCount === 2) {
        batchCompleteHandler(); // Trigger the next batch
        eventSource.close(); // Close the event source
      }
    }
    console.log('count',completedCount, 'FINENAME', eventResponse.fileName, 'STATUS', eventResponse.status);
  };
}