import { useMemo } from 'react';

import { OptionType } from '../types';
export const useHasSelections = (selectedNodes: readonly OptionType[], selectedRels: readonly OptionType[], selectedTupleRels:readonly OptionType[],selectedTupleNodes: readonly OptionType[]) => {
  const hasSelections = useMemo(
    () => selectedNodes.length > 0 || selectedRels.length > 0 || selectedTupleRels.length >0  || selectedTupleNodes.length > 0 ,
    [selectedNodes, selectedRels, selectedTupleNodes, selectedTupleRels]
  );
  return hasSelections;
};
