import { useMemo } from 'react';

import { OptionType } from '../types';
export const useHasSelections = (
  selectedTupleRels: string[],
  selectedTupleNodes: readonly OptionType[]
) => {
  const hasSelections = useMemo(
    () =>
      selectedTupleRels.length > 0 ||
      selectedTupleNodes.length > 0,
    [selectedTupleNodes, selectedTupleRels]
  );
  return hasSelections;
};
