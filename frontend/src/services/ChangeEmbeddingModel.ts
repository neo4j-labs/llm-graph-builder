import api, { createCredentialsFormData } from '../API/Index';
import { UserCredentials } from '../types';

interface ChangeEmbeddingModelParams {
  userCredentials: UserCredentials;
  embeddingProvider: string;
  embeddingModel: string;
}

const changeEmbeddingModelAPI = async ({
  userCredentials,
  embeddingProvider,
  embeddingModel,
}: ChangeEmbeddingModelParams) => {
  try {
    const formData = createCredentialsFormData(userCredentials);
    formData.append('embedding_provider', embeddingProvider);
    formData.append('embedding_model', embeddingModel);

    const response = await api.post(`/change_embedding_model`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.log('Error changing embedding model:', error);
    throw error;
  }
};

export { changeEmbeddingModelAPI };
