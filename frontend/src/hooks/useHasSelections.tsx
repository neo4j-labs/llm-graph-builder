import { useMemo } from 'react';

import { OptionType } from '../types';
export const useHasSelections = (selectedNodes: readonly OptionType[], selectedRels: readonly OptionType[]) => {
  const hasSelections = useMemo(
    () => selectedNodes.length > 0 || selectedRels.length > 0,
    [selectedNodes, selectedRels]
  );
  return hasSelections;
};
