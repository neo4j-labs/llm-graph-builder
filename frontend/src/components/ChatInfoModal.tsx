import { useCallback } from 'react';
import { ChatInfoModalProps } from '../types';
import { Dialog } from '@neo4j-ndl/react';

const ChatInfoModal: React.FC<ChatInfoModalProps> = ({ hideModal, open, children }) => {
  const onClose = useCallback(() => {
    hideModal();
  }, []);

  return (
    <Dialog
      modalProps={{
        className: 'w-full',
        id: 'Chat-info-modal',
      }}
      onClose={onClose}
      open={open}
      size='small'
    >
      <Dialog.Content>{children}</Dialog.Content>
    </Dialog>
  );
};
export default ChatInfoModal;
