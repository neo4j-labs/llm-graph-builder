import api from '../API/Index';

const getAdditionalMetrics = async (
  question: string,
  context: string,
  answer: string,
  reference: string,
  model: string,
  mode: string
) => {
  try {
    const formData = new FormData();
    formData.append('question', question ?? '');
    formData.append('context', context ?? '');
    formData.append('answer', answer ?? '');
    formData.append('reference', reference ?? '');
    formData.append('model', model ?? '');
    formData.append('mode', mode ?? '');

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
