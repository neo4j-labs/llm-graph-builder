export interface EmbeddingConfig {
  provider: string;
  model: string;
  dimension: number;
  db_vector_dimension?: number;
  updated_at?: string;
}

export const getEmbeddingConfig = (): EmbeddingConfig | null => {
  try {
    const config = localStorage.getItem('embeddingConfig');
    if (config) {
      return JSON.parse(config);
    }
    const provider = localStorage.getItem('embeddingProvider');
    const model = localStorage.getItem('embeddingModel');
    const dimension = localStorage.getItem('embeddingDimension');
    const oldDimensions = localStorage.getItem('embedding.dimensions');

    if (provider && model) {
      let dbDimension = dimension ? parseInt(dimension) : 0;
      if (oldDimensions) {
        try {
          const parsed = JSON.parse(oldDimensions);
          dbDimension = parsed.db_vector_dimension || dbDimension;
        } catch (e) {
          console.error('Error parsing old embedding.dimensions:', e);
        }
      }

      const migratedConfig = {
        provider,
        model,
        dimension: dimension ? parseInt(dimension) : 0,
        db_vector_dimension: dbDimension,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('embeddingConfig', JSON.stringify(migratedConfig));
      return migratedConfig;
    }
  } catch (e) {
    console.error('Error reading embedding config:', e);
  }
  return null;
};

export const setEmbeddingConfig = (config: {
  provider: string;
  model: string;
  dimension: number;
  db_vector_dimension?: number;
}) => {
  try {
    const dbDimension = config.db_vector_dimension || config.dimension;
    const embeddingConfig = {
      provider: config.provider,
      model: config.model,
      dimension: config.dimension,
      db_vector_dimension: dbDimension,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('embeddingConfig', JSON.stringify(embeddingConfig));
  } catch (e) {
    console.error('Error saving embedding config:', e);
  }
};

export const getEmbeddingProvider = (): string => {
  const config = getEmbeddingConfig();
  return config?.provider || 'sentence-transformer';
};

export const getEmbeddingModel = (): string => {
  const config = getEmbeddingConfig();
  return config?.model || 'all-MiniLM-L6-v2';
};

export const clearEmbeddingConfig = () => {
  localStorage.removeItem('embeddingConfig');
  localStorage.removeItem('embeddingProvider');
  localStorage.removeItem('embeddingModel');
  localStorage.removeItem('embeddingDimension');
  localStorage.removeItem('embedding.dimensions');
};

export interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  chunksToCombine: number;
  instructions: string;
  updated_at?: string;
}

export const getChunkConfig = (): ChunkConfig | null => {
  try {
    const config = localStorage.getItem('chunkConfig');
    if (config) {
      return JSON.parse(config);
    }
    const chunkSizeStr = localStorage.getItem('selectedChunk_size');
    const tokenChunkSizeStr = localStorage.getItem('selectedTokenChunkSize');
    const chunkOverlapStr = localStorage.getItem('selectedChunk_overlap');
    const chunksToCombineStr = localStorage.getItem('selectedChunks_to_combine');
    const instructions = localStorage.getItem('instructions');

    if (chunkSizeStr || tokenChunkSizeStr || chunkOverlapStr || chunksToCombineStr || instructions) {
      let chunkSizeValue = 0;
      if (tokenChunkSizeStr) {
        try {
          chunkSizeValue = JSON.parse(tokenChunkSizeStr).selectedOption;
        } catch {
          chunkSizeValue = parseInt(tokenChunkSizeStr) || 0;
        }
      } else if (chunkSizeStr) {
        chunkSizeValue = JSON.parse(chunkSizeStr).selectedOption;
      }

      const migratedConfig: ChunkConfig = {
        chunkSize: chunkSizeValue,
        chunkOverlap: chunkOverlapStr ? JSON.parse(chunkOverlapStr).selectedOption : 0,
        chunksToCombine: chunksToCombineStr ? JSON.parse(chunksToCombineStr).selectedOption : 0,
        instructions: instructions || '',
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('chunkConfig', JSON.stringify(migratedConfig));
      return migratedConfig;
    }
  } catch (e) {
    console.error('Error reading chunk config:', e);
  }
  return null;
};

export const setChunkConfig = (config: {
  chunkSize: number;
  chunkOverlap: number;
  chunksToCombine: number;
  instructions: string;
}) => {
  try {
    const chunkConfig: ChunkConfig = {
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      chunksToCombine: config.chunksToCombine,
      instructions: config.instructions,
      updated_at: new Date().toISOString(),
    };

    // Store only the consolidated config object
    localStorage.setItem('chunkConfig', JSON.stringify(chunkConfig));

    // Clean up any legacy keys if they exist
    localStorage.removeItem('selectedChunk_size');
    localStorage.removeItem('selectedTokenChunkSize');
    localStorage.removeItem('selectedChunk_overlap');
    localStorage.removeItem('selectedChunks_to_combine');
    localStorage.removeItem('instructions');
  } catch (e) {
    console.error('Error saving chunk config:', e);
  }
};

/**
 * Clear all chunk configuration from localStorage
 */
export const clearChunkConfig = () => {
  localStorage.removeItem('chunkConfig');
  localStorage.removeItem('selectedChunk_size');
  localStorage.removeItem('selectedTokenChunkSize');
  localStorage.removeItem('selectedChunk_overlap');
  localStorage.removeItem('selectedChunks_to_combine');
  localStorage.removeItem('instructions');
};
