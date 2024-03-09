import { Banner, Button, Dialog } from '@neo4j-ndl/react';
import { CustomModalProps } from '../types';

const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onClose,
  children,
  submitLabel = 'Submit',
  submitHandler,
  statusMessage,
  status,
  setStatus,
}) => {
  return (
    <Dialog
      size='small'
      open={open}
      disableCloseButton
      modalProps={{
        id: 'default-menu',
      }}
      onClose={onClose}
    >
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        {status !== 'unknown' && (
          <Banner closeable description={statusMessage} onClose={() => setStatus('unknown')} type={status} name='Custom Banner'/>
        )}
        <div className='n-flex n-flex-row n-flex-wrap'>{children}</div>
        <Dialog.Actions className='mt-4'>
          <Button color='neutral' fill='outlined' onClick={onClose} size='medium'>
            Cancel
          </Button>
          <Button onClick={submitHandler} size='medium'>
            {submitLabel}
          </Button>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};

export default CustomModal;
