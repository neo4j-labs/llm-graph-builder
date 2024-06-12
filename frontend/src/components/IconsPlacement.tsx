import { TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import { IconButton } from '@neo4j-ndl/react';
import { Messages } from '../types';
import IconButtonWithToolTip from './IconButtonToolTip';

interface IconProps {
  closeChatBot: () => void;
  deleteOnClick?: () => void;
  messages: Messages[];
}

const IconsPlacement: React.FC<IconProps> = ({ closeChatBot, deleteOnClick, messages }) => {
  return (
    <div className='flex items-end justify-end'>
      <IconButtonWithToolTip
        text='Clear chat history'
        aria-label='Remove chat history'
        clean
        onClick={deleteOnClick}
        disabled={messages.length === 1}
        placement='left'
        label='clear chat history'
      >
        <TrashIconOutline />
      </IconButtonWithToolTip>
      <IconButton aria-label='Remove chatbot' clean onClick={closeChatBot}>
        <XMarkIconOutline />
      </IconButton>
    </div>
  );
};

export default IconsPlacement;
