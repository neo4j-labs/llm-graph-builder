import { Checkbox } from '@neo4j-ndl/react';

function MetricsCheckbox({
  enableReference,
  toggleReferenceVisibility,
  isDisabled = false,
}: {
  enableReference: boolean;
  toggleReferenceVisibility: React.DispatchWithoutAction;
  isDisabled?: boolean;
}) {
  return (
    <Checkbox
      isDisabled={isDisabled}
      label={'Get More Metrics by providing reference answer'}
      isChecked={enableReference}
      onChange={toggleReferenceVisibility}
    />
  );
}
export default MetricsCheckbox;
