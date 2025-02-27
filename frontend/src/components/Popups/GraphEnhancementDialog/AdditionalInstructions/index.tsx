import { Flex, Select, TextArea, Typography, useMediaQuery } from '@neo4j-ndl/react';
import {
  appLabels,
  buttonCaptions,
  defaultChunkOverlapOptions,
  defaultTokenChunkSizeOptions,
  defaultChunksToCombineOptions,
  tooltips,
} from '../../../../utils/Constants';
import { tokens } from '@neo4j-ndl/base';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { useCallback } from 'react';
import { useFileContext } from '../../../../context/UsersFiles';
import { showNormalToast } from '../../../../utils/Toasts';
import { OnChangeValue } from 'react-select';
import { OptionType } from '../../../../types';

export default function AdditionalInstructionsText({
  closeEnhanceGraphSchemaDialog,
}: {
  closeEnhanceGraphSchemaDialog: () => void;
}) {
  const { breakpoints } = tokens;
  const tablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
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
  return (
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
            label='Additional Instructions'
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
  );
}
