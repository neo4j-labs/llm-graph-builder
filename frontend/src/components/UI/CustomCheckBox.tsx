import { Checkbox } from '@neo4j-ndl/react';
import React, { HTMLProps } from 'react';

export default function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = React.useRef<HTMLInputElement>(null!);

  React.useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <Checkbox aria-label='row checkbox' type='checkbox' ref={ref} className={`${className} cursor-pointer`} {...rest} />
  );
}
