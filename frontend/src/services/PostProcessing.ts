import api from '../API/Index';
import { getEmbeddingProvider, getEmbeddingModel } from '../utils/EmbeddingConfigUtils';

const postProcessing = async (taskParam: string[]) => {
  try {
    const formData = new FormData();
    formData.append('tasks', JSON.stringify(taskParam));
    const embeddingProvider = getEmbeddingProvider();
    const embeddingModel = getEmbeddingModel();
    formData.append('embedding_provider', embeddingProvider);
    formData.append('embedding_model', embeddingModel);
    const response = await api.post(`/post_processing`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error updating the graph:', error);
    throw error;
  }
};

export { postProcessing };
