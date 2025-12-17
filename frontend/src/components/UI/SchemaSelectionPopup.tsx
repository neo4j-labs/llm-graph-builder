import { Dialog, Button, LoadingSpinner, Typography } from '@neo4j-ndl/react';
import PatternContainer from '../Popups/GraphEnhancementDialog/EnitityExtraction/PatternContainer';
import { SchemaSelectionProps } from '../../types';

const SchemaSelectionDialog = ({
  open,
  onClose,
  pattern,
  nodes,
  rels,
  handleRemove,
  handleSchemaView,
  loading,
  highlightPattern,
  onApply,
  onCancel,
  message,
}: SchemaSelectionProps) => {
  return (
    <Dialog size='medium' isOpen={open} onClose={onClose} htmlAttributes={{ 'aria-labelledby': 'form-dialog-title' }}>
      <Dialog.Header>{'Schema From Database'}</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        {loading ? (
          <div className='my-40 flex! items-center justify-center'>
            <LoadingSpinner size='large' />
          </div>
        ) : pattern.length !== 0 ? (
          <PatternContainer
            pattern={pattern}
            handleRemove={handleRemove}
            handleSchemaView={handleSchemaView}
            highlightPattern={highlightPattern ?? ''}
            nodes={nodes}
            rels={rels}
          ></PatternContainer>
        ) : (
          <div className='my-40 flex! items-center justify-center'>
            <Typography variant='body-medium'>{message}</Typography>
          </div>
        )}
        <Dialog.Actions className='mt-3'>
          <Button onClick={onCancel} isDisabled={pattern.length === 0 || loading}>
            Cancel
          </Button>
          <Button onClick={onApply} isDisabled={pattern.length === 0 || loading}>
            Apply
          </Button>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};
export default SchemaSelectionDialog;
