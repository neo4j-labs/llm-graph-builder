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

// import { eventResponsetypes } from '../types';
// import { url } from '../utils/Utils';
// export function triggerStatusUpdateAPI(
//  name: string,
//  uri: string,
//  username: string,
//  password: string,
//  database: string,
//  datahandler: (i: eventResponsetypes) => void
// ): Promise<eventResponsetypes> {
//  return new Promise((resolve, reject) => {
//    let encodedstr;
//    if (password) {
//      encodedstr = btoa(password);
//    }
//    const eventSource = new EventSource(
//      `${url()}/update_extract_status/${name}?url=${uri}&userName=${username}&password=${encodedstr}&database=${database}`
//    );
//    eventSource.onmessage = (event) => {
//      const eventResponse = JSON.parse(event.data);
//      datahandler(eventResponse); // Call the data handler with each response
//      console.log('event', eventResponse);
//      if (
//        eventResponse.status === 'Completed' ||
//        eventResponse.status === 'Failed' ||
//        eventResponse.status === 'Cancelled'
//      ) {
//        if (eventResponse.status === 'Completed') {
//          resolve(eventResponse);
//        } else if (eventResponse.status === 'Failed') {
//          reject(new Error(`Status update failed with status: ${eventResponse.status}`));
//        }
//        eventSource.close();
//      }
//    };
//    eventSource.onerror = (err) => {
//      eventSource.close();
//      reject(err);
//    };
//  });
// }