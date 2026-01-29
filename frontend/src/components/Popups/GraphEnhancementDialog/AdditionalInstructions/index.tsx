import { Flex, Select, TextArea, Typography, useMediaQuery, Tooltip } from '@neo4j-ndl/react';
import {
  appLabels,
  buttonCaptions,
  defaultChunkOverlapOptions,
  defaultTokenChunkSizeOptions,
  defaultChunksToCombineOptions,
  tooltips,
  embeddingModels,
  EmbeddingModelOption,
} from '../../../../utils/Constants';
import { tokens } from '@neo4j-ndl/base';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { useCallback, useState, useEffect } from 'react';
import { useFileContext } from '../../../../context/UsersFiles';
import { showNormalToast, showErrorToast } from '../../../../utils/Toasts';
import { OnChangeValue } from 'react-select';
import { OptionType } from '../../../../types';
import EmbeddingDimensionWarningModal from '../../EmbeddingDimensionWarningModal';
import { changeEmbeddingModelAPI } from '../../../../services/ChangeEmbeddingModel';
import { useCredentials } from '../../../../context/UserCredentials';

export default function AdditionalInstructionsText({
  closeEnhanceGraphSchemaDialog,
}: {
  closeEnhanceGraphSchemaDialog: () => void;
}) {
  const { breakpoints } = tokens;
  const tablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const { userCredentials } = useCredentials();
  const {
    additionalInstructions,
    setAdditionalInstructions,
    setSelectedTokenChunkSize,
    setSelectedChunk_overlap,
    selectedTokenChunkSize,
    selectedChunk_overlap,
    selectedChunks_to_combine,
    setSelectedChunks_to_combine,
  } = useFileContext();

  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<EmbeddingModelOption>(() => {
    const storedProvider = localStorage.getItem('embeddingProvider');
    const storedModel = localStorage.getItem('embeddingModel');
    if (storedProvider && storedModel) {
      const found = embeddingModels.find((opt) => opt.provider === storedProvider && opt.model === storedModel);
      return found || embeddingModels[0];
    }
    return embeddingModels[0];
  });

  const [showDimensionWarning, setShowDimensionWarning] = useState(false);
  const [pendingEmbeddingModel, setPendingEmbeddingModel] = useState<EmbeddingModelOption | null>(null);
  const [isEmbeddingReadonly, setIsEmbeddingReadonly] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem('embeddingProvider');
    const storedModel = localStorage.getItem('embeddingModel');
    const allowEmbeddingChange = localStorage.getItem('allowEmbeddingChange');
    setIsEmbeddingReadonly(allowEmbeddingChange === 'false');

    if (storedProvider && storedModel) {
      const found = embeddingModels.find((opt) => opt.provider === storedProvider && opt.model === storedModel);
      if (
        found &&
        (found.provider !== selectedEmbeddingModel.provider || found.model !== selectedEmbeddingModel.model)
      ) {
        setSelectedEmbeddingModel(found);
      }
    }
  }, []);

  const clickAnalyzeInstructHandler = useCallback(async () => {
    localStorage.setItem('instructions', additionalInstructions);
    closeEnhanceGraphSchemaDialog();
    showNormalToast(`Successfully Applied the Instructions`);
  }, [additionalInstructions]);
  const onChangeChunk_size = (newValue: OnChangeValue<OptionType, false>) => {
    if (newValue !== null) {
      const parsedValue = Number(newValue.value);
      if (isNaN(parsedValue)) {
        showNormalToast('Chunk size must be a valid number');
        return;
      }
      setSelectedTokenChunkSize(parsedValue);
      localStorage.setItem('selectedChunk_size', JSON.stringify({ selectedOption: parsedValue }));
    }
  };
  const onChangeChunk_overlap = (newValue: OnChangeValue<OptionType, false>) => {
    if (newValue !== null) {
      const parsedValue = Number(newValue.value);
      if (isNaN(parsedValue)) {
        showNormalToast('Chunk overlap must be a valid number');
        return;
      }
      setSelectedChunk_overlap(parsedValue);
      localStorage.setItem('selectedChunk_overlap', JSON.stringify({ selectedOption: parsedValue }));
    }
  };
  const onChangeChunks_to_combine = (newValue: OnChangeValue<OptionType, false>) => {
    if (newValue !== null) {
      const parsedValue = Number(newValue.value);
      if (isNaN(parsedValue)) {
        showNormalToast('Chunks to combine must be a valid number');
        return;
      }
      setSelectedChunks_to_combine(parsedValue);
      localStorage.setItem('selectedChunks_to_combine', JSON.stringify({ selectedOption: parsedValue }));
    }
  };

  const onChangeEmbeddingModel = (newValue: unknown) => {
    const value = newValue as EmbeddingModelOption | null;
    if (value !== null) {
      // Check if this is actually a change from the current model
      if (value.provider === selectedEmbeddingModel.provider && value.model === selectedEmbeddingModel.model) {
        return; // No change, do nothing
      }

      const dimensionsStr = localStorage.getItem('embedding.dimensions');
      const connectionStr = localStorage.getItem('neo4j.connection');

      let dbDimension = 0;
      if (dimensionsStr) {
        try {
          const dimensions = JSON.parse(dimensionsStr);
          dbDimension = dimensions.db_vector_dimension;
          console.log('DB dimension from dedicated storage:', dbDimension);
        } catch (e) {
          console.error('Error parsing dimension data:', e);
        }
      }
      if (!dbDimension && connectionStr) {
        try {
          const connectionData = JSON.parse(connectionStr);
          dbDimension = connectionData.db_vector_dimension || connectionData.userDbVectorIndex;
        } catch (e) {
          console.error('Error parsing connection data:', e);
        }
      }
      if (dbDimension && dbDimension > 0 && dbDimension !== value.dimension) {
        setPendingEmbeddingModel(value);
        setShowDimensionWarning(true);
        return;
      }
      // If dimensions match or no existing dimension, call API directly
      applyEmbeddingModelChange(value);
    }
  };

  const applyEmbeddingModelChange = async (value: EmbeddingModelOption) => {
    if (!userCredentials) {
      showErrorToast('User credentials not available');
      return;
    }

    try {
      const response = await changeEmbeddingModelAPI({
        userCredentials,
        embeddingProvider: value.provider,
        embeddingModel: value.model,
      });

      if (response?.data?.status === 'Success') {
        setSelectedEmbeddingModel(value);
        localStorage.setItem('embeddingProvider', value.provider);
        localStorage.setItem('embeddingModel', value.model);
        localStorage.setItem('embeddingDimension', value.dimension.toString());
        const displayLabel = `${value.provider.charAt(0).toUpperCase() + value.provider.slice(1)} ${value.model}`;
        showNormalToast(
          response.data.message || `Embedding model set to ${displayLabel} (dimension: ${value.dimension})`
        );
      } else {
        const errorMsg = response?.data?.message || 'Failed to change embedding model';
        showErrorToast(errorMsg);
      }
    } catch (error) {
      console.error('Error changing embedding model:', error);
      showErrorToast('Failed to change embedding model. Please try again.');
    }
  };

  const handleWarningProceed = async (provider: string, model: string) => {
    if (!userCredentials) {
      showErrorToast('User credentials not available');
      return;
    }

    try {
      const response = await changeEmbeddingModelAPI({
        userCredentials,
        embeddingProvider: provider,
        embeddingModel: model,
      });

      if (response?.data?.status === 'Success') {
        showNormalToast(response.data.message || 'Embedding model changed successfully');
        if (pendingEmbeddingModel) {
          setSelectedEmbeddingModel(pendingEmbeddingModel);
          localStorage.setItem('embeddingProvider', pendingEmbeddingModel.provider);
          localStorage.setItem('embeddingModel', pendingEmbeddingModel.model);
          localStorage.setItem('embeddingDimension', pendingEmbeddingModel.dimension.toString());
          setPendingEmbeddingModel(null);
        }
        setShowDimensionWarning(false);
      } else {
        const errorMsg = response?.data?.message || 'Failed to change embedding model';
        showErrorToast(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error in handleWarningProceed:', error);
      throw error;
    }
  };

  const handleWarningCancel = () => {
    setPendingEmbeddingModel(null);
    setShowDimensionWarning(false);
  };

  return (
    <>
      <EmbeddingDimensionWarningModal
        open={showDimensionWarning}
        onClose={handleWarningCancel}
        onProceed={handleWarningProceed}
        dbDimension={(() => {
          try {
            const dimensionsStr = localStorage.getItem('embedding.dimensions');
            if (dimensionsStr) {
              const dimensions = JSON.parse(dimensionsStr);
              return dimensions.db_vector_dimension || 0;
            }
            const connectionStr = localStorage.getItem('neo4j.connection');
            if (connectionStr) {
              const conn = JSON.parse(connectionStr);
              return conn.db_vector_dimension || conn.userDbVectorIndex || 0;
            }
            return 0;
          } catch {
            return 0;
          }
        })()}
        selectedDimension={pendingEmbeddingModel?.dimension || 0}
        pendingEmbeddingModel={pendingEmbeddingModel}
      />
      <div>
        <Flex flexDirection='column'>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant={tablet ? 'subheading-medium' : 'subheading-large'}>
              {buttonCaptions.provideAdditionalInstructions}
            </Typography>
          </Flex>
          <Flex justifyContent='space-between' flexDirection='column' gap='6'>
            <TextArea
              helpText={buttonCaptions.helpInstructions}
              label='Processing Configuration'
              style={{
                resize: 'vertical',
              }}
              isFluid={true}
              value={additionalInstructions}
              htmlAttributes={{
                onChange: (e) => setAdditionalInstructions(e.target.value),
              }}
              size='small'
            />
          </Flex>
          <Flex className='mt-4! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
            <Flex flexDirection='row' gap='4'>
              <ButtonWithToolTip
                placement='top'
                label='Analyze button'
                text={tooltips.additionalInstructions}
                disabled={additionalInstructions.trim() === ''}
                onClick={clickAnalyzeInstructHandler}
              >
                {buttonCaptions.analyzeInstructions}
              </ButtonWithToolTip>
            </Flex>
          </Flex>
        </Flex>
        <div className='mt-4'>
          <div className='flex align-self-center justify-left'>
            <h5>{appLabels.chunkingConfiguration}</h5>
          </div>
          <Select
            label='Embedding Model'
            size='medium'
            type='creatable'
            isDisabled={isEmbeddingReadonly}
            selectProps={{
              isMulti: false,
              isDisabled: isEmbeddingReadonly,
              options: (() => {
                const otherModels = embeddingModels.filter(
                  (model) =>
                    model.provider !== selectedEmbeddingModel.provider || model.model !== selectedEmbeddingModel.model
                );
                const reorderedModels = [selectedEmbeddingModel, ...otherModels];
                return reorderedModels.map((model) => ({
                  ...model,
                  label: (
                    <Tooltip type='simple' placement='right'>
                      <Tooltip.Trigger>
                        <span className='text-nowrap'>{model.label}</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <div className='flex flex-col gap-1'>
                          <div>
                            <strong>Provider:</strong> {model.provider}
                          </div>
                          <div>
                            <strong>Model:</strong> {model.model}
                          </div>
                          <div>
                            <strong>Dimension:</strong> {model.dimension}
                          </div>
                        </div>
                      </Tooltip.Content>
                    </Tooltip>
                  ),
                }));
              })(),
              onChange: onChangeEmbeddingModel,
              value: {
                ...selectedEmbeddingModel,
                label: (
                  <Tooltip type='simple' placement='right'>
                    <Tooltip.Trigger>
                      <span className='text-nowrap'>{selectedEmbeddingModel.label}</span>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className='flex flex-col gap-1'>
                        <div>
                          <strong>Provider:</strong> {selectedEmbeddingModel.provider}
                        </div>
                        <div>
                          <strong>Model:</strong> {selectedEmbeddingModel.model}
                        </div>
                        <div>
                          <strong>Dimension:</strong> {selectedEmbeddingModel.dimension}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                ),
              },
            }}
            helpText={
              isEmbeddingReadonly
                ? 'Embedding model is configured by your administrator and cannot be changed'
                : 'Select the embedding model to use for vector indexing and similarity searches'
            }
          />
          <Select
            label='Token Count Per Chunk'
            size='medium'
            selectProps={{
              options: defaultTokenChunkSizeOptions.map((value) => ({
                value: value.toString(),
                label: value.toString(),
              })),
              onChange: onChangeChunk_size,
              value: {
                value: selectedTokenChunkSize.toString(),
                label: selectedTokenChunkSize.toString(),
              },
              classNamePrefix: `
                  ${
                    tablet
                      ? 'tablet_entity_extraction_Tab_relationship_label'
                      : 'entity_extraction_Tab_relationship_label'
                  }
                `,
            }}
            type='creatable'
            helpText='The maximum token limit is 10,000 for LLM processing. The total number of chunks will be calculated as 10,000 divided by the tokens per chunk you select. For example, selecting 500 tokens per chunk results in 20 chunks (10,000 / 500).'
          />
          <Select
            label='Chunk Overlap'
            size='medium'
            selectProps={{
              isMulti: false,
              options: defaultChunkOverlapOptions.map((value) => ({
                value: value.toString(),
                label: value.toString(),
              })),
              onChange: onChangeChunk_overlap,
              value: {
                value: selectedChunk_overlap.toString(),
                label: selectedChunk_overlap.toString(),
              },
            }}
            type='creatable'
          />
          <Select
            label='Chunks to combine'
            size='medium'
            selectProps={{
              isMulti: false,
              options: defaultChunksToCombineOptions.map((value) => ({
                value: value.toString(),
                label: value.toString(),
              })),
              onChange: onChangeChunks_to_combine,
              value: {
                value: selectedChunks_to_combine.toString(),
                label: selectedChunks_to_combine.toString(),
              },
            }}
            type='creatable'
          />
        </div>
      </div>
    </>
  );
}
