import { commonserverresponse, selectedDuplicateNodes } from '../types';
import api from '../API/Index';

const mergeDuplicateNodes = async (selectedNodes: selectedDuplicateNodes[]) => {
  try {
    const formData = new FormData();
    formData.append('duplicate_nodes_list', JSON.stringify(selectedNodes));
    const response = await api.post<commonserverresponse>(`/merge_duplicate_nodes`, formData);
    return response;
  } catch (error) {
    console.log('Error Merging the duplicate nodes:', error);
    throw error;
  }
};
export default mergeDuplicateNodes;
