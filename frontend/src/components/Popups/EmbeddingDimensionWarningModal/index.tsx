import { Button, Dialog, Typography, Banner } from '@neo4j-ndl/react';
import { memo, useState } from 'react';
import { createVectorIndex } from '../../../services/VectorIndexCreation';
import { showErrorToast, showNormalToast } from '../../../utils/Toasts';

interface EmbeddingDimensionWarningModalProps {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  dbDimension: number;
  selectedDimension: number;
}

function EmbeddingDimensionWarningModal({
  open,
  onClose,
  onProceed,
  dbDimension,
  selectedDimension,
}: EmbeddingDimensionWarningModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProceed = async () => {
    console.log('User acknowledged dimension mismatch warning');
    console.log('Details:', {
      previousDimension: dbDimension,
      newDimension: selectedDimension,
      timestamp: new Date().toISOString(),
    });

    setIsProcessing(true);
    try {
      const response = await createVectorIndex(true);
      if (response.data.status === 'Success') {
        showNormalToast('Vector index recreated successfully');
        onProceed();
      } else {
        const errorMsg =
          typeof response.data.message === 'string' ? response.data.message : 'Failed to recreate vector index';
        showErrorToast(errorMsg);
      }
    } catch (error) {
      console.error('Error recreating vector index:', error);
      showErrorToast('Failed to recreate vector index. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      size='medium'
      isOpen={open}
      onClose={onClose}
      htmlAttributes={{
        'aria-labelledby': 'embedding-dimension-warning-dialog',
      }}
    >
      <Dialog.Header htmlAttributes={{ id: 'embedding-dimension-warning-dialog' }}>
        Embedding Dimension Mismatch Warning
      </Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <Banner
          type='warning'
          name='Warning Banner'
          description='Mixing embeddings with different dimensions may cause errors'
          usage='inline'
        />
        <div className='n-flex n-flex-col n-gap-token-3'>
          <Typography variant='body-medium'>
            <strong>You previously used an embedding model with a dimension of {dbDimension}</strong> to create and
            store document embeddings in the database.
          </Typography>
          <Typography variant='body-medium'>
            You are now selecting a different model with a dimension of <strong>{selectedDimension}</strong>.
          </Typography>
          <Typography variant='body-medium' className='n-text-palette-danger-text'>
            <strong>Warning:</strong> Mixing embeddings of different dimensions in the same database is not supported
            and may cause errors or incorrect results.
          </Typography>
          <div className='n-bg-palette-neutral-bg-weak n-p-token-4 n-rounded'>
            <Typography variant='subheading-medium' className='n-mb-token-3'>
              To proceed safely, you must:
            </Typography>
            <ol className='n-list-decimal n-ml-token-6 n-flex n-flex-col n-gap-token-2'>
              <li>
                <Typography variant='body-medium'>Drop the existing vector index from the database</Typography>
              </li>
              <li>
                <Typography variant='body-medium'>
                  Reprocess all previously uploaded files using the new embedding model
                </Typography>
              </li>
            </ol>
          </div>
          <Typography variant='body-medium'>
            This ensures all embeddings are consistent and compatible with the selected model.
          </Typography>
          <Typography variant='body-small' className='n-text-palette-neutral-text-weak'>
            If you need help, please contact the support team.
          </Typography>
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onClick={onClose} size='medium' fill='outlined' isDisabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleProceed} size='medium' isLoading={isProcessing} isDisabled={isProcessing}>
          I Understand, Proceed
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}

export default memo(EmbeddingDimensionWarningModal);
