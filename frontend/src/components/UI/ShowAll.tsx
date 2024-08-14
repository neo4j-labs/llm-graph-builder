import { Button } from '@neo4j-ndl/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

// import { ButtonGroup } from '../button-group/button-group';

type ShowAllProps = {
  initiallyShown: number;
  /* pass thunk to enable rendering only shown components */
  children: ((() => ReactNode) | ReactNode)[];
  ariaLabel?: string;
};
const isThunkComponent = (t: (() => ReactNode) | ReactNode): t is () => ReactNode => typeof t === 'function';

export function ShowAll({ initiallyShown, children }: ShowAllProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => setExpanded((e) => !e);
  const itemCount = children.length;
  const controlsNeeded = itemCount > initiallyShown;
  const shown = expanded ? itemCount : initiallyShown;
  const leftToShow = itemCount - shown;

  if (itemCount === 0) {
    return null;
  }

  const currentChildren = children.slice(0, shown).map((c) => (isThunkComponent(c) ? c() : c));
  return (
    <>
      <div style={{ all: 'inherit' }}>{currentChildren}</div>
      {controlsNeeded && (
        <Button fill='text' size='small' onClick={toggleExpanded}>
          {expanded ? 'Show less' : `Show all (${leftToShow} more)`}
        </Button>
      )}
    </>
  );
}
