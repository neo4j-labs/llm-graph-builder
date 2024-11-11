import { Checkbox } from '@neo4j-ndl/react';

function MetricsCheckbox({
  enableReference,
  toggleReferenceVisibility,
}: {
  enableReference: boolean;
  toggleReferenceVisibility: React.DispatchWithoutAction;
}) {
  return (
    <Checkbox
      label='Get More Metrics by providing reference'
      checked={enableReference}
      onChange={toggleReferenceVisibility}
    />
  );
}
export default MetricsCheckbox;
