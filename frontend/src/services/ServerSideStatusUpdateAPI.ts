import { eventResponsetypes, UserCredentials } from '../types';
import api from '../API/Index';
export function triggerStatusUpdateAPI(
  name: string,
  userCredentials: UserCredentials,
  datahandler: (i: eventResponsetypes) => void
) {
  const formData = new FormData();
  if (userCredentials.uri) {
    formData.append('uri', userCredentials.uri);
  }
  if (userCredentials.database) {
    formData.append('database', userCredentials.database);
  }
  if (userCredentials.userName) {
    formData.append('userName', userCredentials.userName);
  }
  if (userCredentials.password) {
    formData.append('password', userCredentials.password);
  }
  if (userCredentials.email) {
    formData.append('email', userCredentials.email);
  }

  const poll = async () => {
    const response = await api.post(`/document_status/${name}`, formData);
    const eventResponse = response?.data?.file_name;
    if (!eventResponse) {
      return;
    }

    datahandler(eventResponse);
    if (eventResponse.status === 'Completed' || eventResponse.status === 'Failed' || eventResponse.status === 'Cancelled') {
      return;
    }

    setTimeout(poll, 1000);
  };

  void poll();
}
