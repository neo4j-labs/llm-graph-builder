import { Button, Dialog, Typography, Banner } from '@neo4j-ndl/react';
import { memo, useState } from 'react';
import { EmbeddingModelOption } from '../../../utils/Constants';
import { showErrorToast } from '../../../utils/Toasts';

interface EmbeddingDimensionWarningModalProps {
  open: boolean;
  onClose: () => void;
  onProceed: (provider: string, model: string) => Promise<void>;
  dbDimension: number;
  selectedDimension: number;
  pendingEmbeddingModel: EmbeddingModelOption | null;
}

function EmbeddingDimensionWarningModal({
  open,
  onClose,
  onProceed,
  dbDimension,
  selectedDimension,
  pendingEmbeddingModel,
}: EmbeddingDimensionWarningModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleProceed = async () => {
    if (!pendingEmbeddingModel) {
      showErrorToast('No embedding model selected');
      return;
    }

    console.log('User acknowledged dimension mismatch warning');
    console.log('Details:', {
      previousDimension: dbDimension,
      newDimension: selectedDimension,
      provider: pendingEmbeddingModel.provider,
      model: pendingEmbeddingModel.model,
      timestamp: new Date().toISOString(),
    });

    setIsProcessing(true);
    try {
      await onProceed(pendingEmbeddingModel.provider, pendingEmbeddingModel.model);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error changing embedding model:', error);
      showErrorToast('Failed to change embedding model. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog
      size='medium'
      isOpen={open}
      onClose={handleClose}
      htmlAttributes={{
        'aria-labelledby': 'embedding-dimension-warning-dialog',
      }}
    >
      <Dialog.Header htmlAttributes={{ id: 'embedding-dimension-warning-dialog' }}>
        {isSuccess ? 'Embedding Model Changed Successfully' : 'Embedding Dimension Mismatch Warning'}
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
