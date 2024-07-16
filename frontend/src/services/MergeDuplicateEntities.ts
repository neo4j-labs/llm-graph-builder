// [{firstElementId:"283947sdf", similarElementIds:["aew982349","8sd9fd9s8"}, …. ]
import axios from 'axios';
import { url } from '../utils/Utils';
import { selectedDuplicateNodes, UserCredentials } from '../types';

const mergeDuplicateNodes = async (userCredentials: UserCredentials, selectedNodes: selectedDuplicateNodes[]) => {
  try {
    const formData = new FormData();
    formData.append('uri', userCredentials?.uri ?? '');
    formData.append('database', userCredentials?.database ?? '');
    formData.append('userName', userCredentials?.userName ?? '');
    formData.append('password', userCredentials?.password ?? '');
    formData.append('duplicate_nodes_list', JSON.stringify(selectedNodes));
    const response = await axios.post(`${url()}/merge_duplicate_nodes`, formData);
    return response;
  } catch (error) {
    console.log('Error Merging the duplicate nodes:', error);
    throw error;
  }
};
export default mergeDuplicateNodes;
