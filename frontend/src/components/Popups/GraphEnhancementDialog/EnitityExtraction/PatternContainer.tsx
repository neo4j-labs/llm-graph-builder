import { useState, useEffect } from 'react';
import { Tag } from '@neo4j-ndl/react';
import { appLabels, tooltips } from '../../../../utils/Constants';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { ExploreIcon } from '@neo4j-ndl/react/icons';
import { OptionType } from '../../../../types';

interface PatternContainerProps {
  pattern: string[];
  handleRemove: (pattern: string) => void;
  handleSchemaView: (view?: string) => void;
  highlightPattern?: string;
  nodes?: OptionType[];
  rels?: OptionType[];
}

const PatternContainer = ({
  pattern,
  handleRemove,
  handleSchemaView,
  highlightPattern,
  nodes,
  rels,
}: PatternContainerProps) => {
  const [nodeCount, setNodeCount] = useState(0);
  const [relCount, setRelCount] = useState(0);
  useEffect(() => {
    setNodeCount(nodes?.length ?? 0);
    setRelCount(rels?.length ?? 0);
  }, [nodes, rels]);

  console.log('count', nodeCount);
  return (
    <div className='h-full'>
      <div className='flex align-self-center justify-center border'>
        <h5>{appLabels.selectedPatterns}</h5>
      </div>
      <div className='flex flex-col gap-4 mt-4'>
        <div className='relative patternContainer border p-4 rounded-md shadow-sm'>
          <div className='top-0 right-0 flex justify-end z-10 pb-2 '>
            {pattern.length > 0 && (
              <span className='n-body-small p-1'>
                {nodeCount > 0 || relCount > 0 ? `${nodeCount} Node & ${relCount} Relationship` : ''}
              </span>
            )}
            <ButtonWithToolTip
              label={'Graph Schema'}
              text={tooltips.visualizeGraph}
              placement='top'
              fill='outlined'
              onClick={handleSchemaView}
              size='small'
            >
              <ExploreIcon className='n-size-token-6' />
            </ButtonWithToolTip>
          </div>
          <div className='flex flex-wrap gap-2'>
            {pattern.map((pattern) => (
              <Tag
                key={pattern}
                onRemove={() => handleRemove(pattern)}
                isRemovable={true}
                type='default'
                size='medium'
                className={`rounded-full px-4 py-1 shadow-sm transition-all duration-300 ${
                  pattern === highlightPattern ? 'animate-highlight' : ''
                }`}
              >
                {pattern}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternContainer;
