import { useCallback } from 'react';
import { ChatInfoModalProps } from '../types';
import { Dialog } from '@neo4j-ndl/react';

const ChatInfoModal: React.FC<ChatInfoModalProps> = ({ hideModal, open, info }) => {
  const onClose = useCallback(() => {
    hideModal();
  }, []);

  return (
    <Dialog
      modalProps={{
        className: 'w-full',
        id: 'default-menu',
      }}
      onClose={onClose}
      open={open}
      type='info'
    >
      <Dialog.Content>{info}</Dialog.Content>
    </Dialog>
  );
};
export default ChatInfoModal;
