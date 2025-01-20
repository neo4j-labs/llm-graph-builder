import { Select, useMediaQuery } from '@neo4j-ndl/react';
import { appLabels, defaultChunkOverlapOptions, defaultChunkSizeOptions, defaultChunksToCombineOptions } from '../../../../utils/Constants';
import { tokens } from '@neo4j-ndl/base';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue } from 'react-select';
import { OptionType } from '../../../../types';
import { showNormalToast } from '../../../../utils/toasts';

export default function ChunkingConfiguration() {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);

  const {
    setSelectedChunk_size,
    setSelectedChunk_overlap,
    selectedChunk_size,
    selectedChunk_overlap,
    selectedChunks_to_combine,
    setSelectedChunks_to_combine
  } = useFileContext();

  const onChangeChunk_size = (newValue: OnChangeValue<OptionType, false>) => {
    if (newValue !== null) {
      const parsedValue = Number(newValue.value);
      if (isNaN(parsedValue)) {
        showNormalToast('Chunk size must be a valid number');
        return;
      }
      setSelectedChunk_size(parsedValue);
      localStorage.setItem(
        'selectedChunk_size',
        JSON.stringify({ selectedOption: parsedValue })
      );
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
      localStorage.setItem(
        'selectedChunk_overlap',
        JSON.stringify({ selectedOption: parsedValue })
      );
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
      localStorage.setItem(
        'selectedChunks_to_combine',
        JSON.stringify({ selectedOption: parsedValue })
      );
    }
  };

  return (
    <div>
      <div className='mt-4'>
        <div className='flex align-self-center justify-center'>
          <h5>{appLabels.chunkingConfiguration}</h5>
        </div>
        <Select
          helpText="Enter chunk size"
          label="Chunk Size"
          size={!isTablet ? 'large' : 'medium'}
          selectProps={{
            options: defaultChunkSizeOptions.map((value) => ({
              value: value.toString(),
              label: value.toString(),
            })),
            onChange: onChangeChunk_size,
            value: {
              value: selectedChunk_size.toString(),
              label: selectedChunk_size.toString(),
            },
            classNamePrefix: `
              ${isTablet ? 'tablet_entity_extraction_Tab_relationship_label' : 'entity_extraction_Tab_relationship_label'}
            `,
          }}
          type="creatable"
        />
        <Select
          helpText='Enter chunk overlap'
          label='Chunk Overlap'
          size={!isTablet ? 'large' : 'medium'}
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
          helpText='Enter Chunks to combine'
          label='Chunks to combine'
          size={!isTablet ? 'large' : 'medium'}
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