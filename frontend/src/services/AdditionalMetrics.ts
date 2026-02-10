import api from '../API/Index';
import { getEmbeddingProvider, getEmbeddingModel } from '../utils/EmbeddingConfigUtils';

const getAdditionalMetrics = async (
  question: string,
  context: string[],
  answer: string[],
  reference: string,
  model: string,
  mode: string[]
) => {
  try {
    const formData = new FormData();
    formData.append('question', question ?? '');
    formData.append('context', JSON.stringify(context) ?? '');
    formData.append('answer', JSON.stringify(answer) ?? '');
    formData.append('reference', reference ?? '');
    formData.append('model', model ?? '');
    formData.append('mode', JSON.stringify(mode) ?? '');

    const embeddingProvider = getEmbeddingProvider();
    const embeddingModel = getEmbeddingModel();
    formData.append('embedding_provider', embeddingProvider);
    formData.append('embedding_model', embeddingModel);

    const response = await api.post(`/additional_metrics`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error in connecting to the Neo4j instance :', error);
    throw error;
  }
};
export default getAdditionalMetrics;
