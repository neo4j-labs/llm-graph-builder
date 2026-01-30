import { Dialog, Typography, Banner } from '@neo4j-ndl/react';
import { memo, useState } from 'react';
import { EmbeddingModelOption } from '../../../utils/Constants';
import { showErrorToast } from '../../../utils/Toasts';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';

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

  const handleContactTeam = () => {
    window.open('https://github.com/neo4j-labs/llm-graph-builder/issues/new', '_blank');
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
        {isSuccess ? 'Embedding Model Changed Successfully' : 'Important: Update Your Embedding Model'}
      </Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <div className='n-flex n-flex-col n-gap-token-3'>
          <Typography variant='body-medium'>
            You're switching to a new embedding model, which uses a different method to understand your documents.
          </Typography>
          <div className='n-flex n-flex-col n-gap-token-2'>
            <Typography variant='body-medium'>
              Previous Model Dimension: <strong>{dbDimension}</strong>
            </Typography>
            <Typography variant='body-medium'>
              New Model Dimension: <strong>{selectedDimension}</strong>
            </Typography>
          </div>
          <Typography variant='body-medium'>
            To make sure everything works correctly with the new model, two steps are needed:
          </Typography>
          <div className='n-bg-palette-neutral-bg-weak n-p-token-4 n-rounded'>
            <ol className='n-list-decimal n-ml-token-6 n-flex n-flex-col n-gap-token-3'>
              <li>
                <Typography variant='body-medium'>
                  <strong>Database Index Update:</strong> Clicking <strong>"Update Index"</strong> will automatically
                  update your database's vector index for the new model.
                </Typography>
              </li>
              <li>
                <Typography variant='body-medium'>
                  <strong>Reprocess Your Files:</strong> After the index is updated, you must <strong>manually</strong>{' '}
                  re-process all your previously processed files again. This step ensures your documents are compatible
                  with the new model.
                </Typography>
              </li>
            </ol>
          </div>
          <Banner
            type='warning'
            name='Warning Banner'
            description='Skipping the file reprocessing step will lead to errors and incorrect results.'
            usage='inline'
          />
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <ButtonWithToolTip
          text='Open GitHub to create a new issue for support'
          label='Contact Team'
          onClick={handleContactTeam}
          size='medium'
          fill='outlined'
          disabled={isProcessing}
        >
          Contact Team
        </ButtonWithToolTip>
        <ButtonWithToolTip
          text='Cancel the embedding model change'
          label='Cancel'
          onClick={onClose}
          size='medium'
          fill='outlined'
          disabled={isProcessing}
        >
          Cancel
        </ButtonWithToolTip>
        <ButtonWithToolTip
          text='Update the vector index to match the new embedding dimension'
          label='Update Index'
          onClick={handleProceed}
          size='medium'
          loading={isProcessing}
          disabled={isProcessing}
        >
          <strong>Update Index</strong>
        </ButtonWithToolTip>
      </Dialog.Actions>
    </Dialog>
  );
}

export default memo(EmbeddingDimensionWarningModal);
