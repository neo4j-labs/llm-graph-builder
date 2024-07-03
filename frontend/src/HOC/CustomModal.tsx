import { Banner, Button, Dialog } from '@neo4j-ndl/react';
import { CustomModalProps } from '../types';
import { buttonCaptions } from '../utils/Constants';

const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onClose,
  children,
  submitLabel = buttonCaptions.submit,
  submitHandler,
  statusMessage,
  status,
  setStatus,
}) => {
  const isDisabled = status === 'danger' || status === 'info' || status === 'warning' || status === 'success';
  return (
    <Dialog
      size='small'
      open={open}
      modalProps={{
        id: 'default-menu',
      }}
      onClose={onClose}
    >
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4 mt-6'>
        {status !== 'unknown' && (
          <Banner
            closeable
            description={statusMessage}
            onClose={() => setStatus('unknown')}
            type={status}
            name='Custom Banner'
          />
        )}
        <div className='n-flex n-flex-row n-flex-wrap'>{children}</div>
        <Dialog.Actions className='mt-4'>
          <Button onClick={submitHandler} size='medium' disabled={isDisabled}>
            {submitLabel}
          </Button>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};

export default CustomModal;
