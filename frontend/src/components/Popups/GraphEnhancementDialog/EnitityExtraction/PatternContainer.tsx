import { useMemo } from 'react';
import { Tag } from '@neo4j-ndl/react';
import { appLabels, tooltips } from '../../../../utils/Constants';
import { ExploreIcon } from '@neo4j-ndl/react/icons';
import { OptionType } from '../../../../types';
import { IconButtonWithToolTip } from '../../../UI/IconButtonToolTip';
import TooltipWrapper from '../../../UI/TipWrapper';

interface PatternContainerProps {
  pattern: string[];
  handleRemove: (pattern: string) => void;
  handleSchemaView: (view?: string) => void;
  highlightPattern?: string;
  nodes?: OptionType[];
  rels?: OptionType[];
  nodeProperties?: Record<string, string[]>;
  relProperties?: Record<string, string[]>;
}

const PATTERN_RE = /^(.+?)\s-\[:([A-Z_]+)\]->\s(.+)$/;

const buildPropertyTooltip = (
  pattern: string,
  nodeProperties?: Record<string, string[]>,
  relProperties?: Record<string, string[]>
): string => {
  const m = pattern.match(PATTERN_RE);
  if (!m) {
    return '';
  }
  const [, source, rel, target] = m;
  const lines: string[] = [];
  const nProps = nodeProperties ?? {};
  const rProps = relProperties ?? {};
  if (nProps[source]?.length) {
    lines.push(`${source}: ${nProps[source].join(', ')}`);
  }
  if (rProps[rel]?.length) {
    lines.push(`[:${rel}]: ${rProps[rel].join(', ')}`);
  }
  if (target !== source && nProps[target]?.length) {
    lines.push(`${target}: ${nProps[target].join(', ')}`);
  }
  return lines.join(' • ');
};

const PatternContainer = ({
  pattern,
  handleRemove,
  handleSchemaView,
  highlightPattern,
  nodes,
  rels,
  nodeProperties,
  relProperties,
}: PatternContainerProps) => {
  const nodeCount = useMemo(() => nodes?.length ?? 0, [nodes]);
  const relCount = useMemo(() => rels?.length ?? 0, [rels]);
  return (
    <div className='h-full'>
      <div className='flex align-self-center justify-center border'>
        <h5>{appLabels.selectedPatterns}</h5>
      </div>
      <div className='flex flex-col gap-4 mt-4'>
        <div className='relative patternContainer border p-4 rounded-md shadow-sm'>
          <div className='top-0 right-0 flex justify-between z-10 pb-2 '>
            <span className='n-body-small p-1'>
              {nodeCount > 0 || relCount > 0
                ? `${nodeCount} Node${nodeCount > 1 ? 's' : ''} & ${relCount} Relationship${relCount > 1 ? 's' : ''}`
                : ''}
            </span>
            <IconButtonWithToolTip
              label={'Graph Schema'}
              text={tooltips.visualizeGraph}
              placement='top'
              onClick={() => handleSchemaView()}
              clean={true}
            >
              <ExploreIcon className='n-size-token-8' />
            </IconButtonWithToolTip>
          </div>
          <div className='flex flex-wrap gap-2'>
            {pattern.map((p) => {
              const propsTooltip = buildPropertyTooltip(p, nodeProperties, relProperties);
              const tag = (
                <Tag
                  key={p}
                  onRemove={() => handleRemove(p)}
                  isRemovable={true}
                  type='default'
                  size='medium'
                  className={`rounded-full px-4 py-1 shadow-sm transition-all duration-300 ${
                    p === highlightPattern ? 'animate-highlight' : ''
                  }`}
                >
                  {p}
                </Tag>
              );
              return propsTooltip ? (
                <TooltipWrapper key={p} placement='top' tooltip={propsTooltip}>
                  {tag}
                </TooltipWrapper>
              ) : (
                tag
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternContainer;
