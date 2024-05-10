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
        id: 'default-menu',
      }}
      onClose={onClose}
      open={open}
      size='small'
    >
      <Dialog.Content style={{height:'400px'}}>
        {children}
      </Dialog.Content>
    </Dialog>
  );
};
export default ChatInfoModal;
