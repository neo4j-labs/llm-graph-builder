import { TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import ChatModeToggle from './ChatModeToggle';
import { Flex, IconButton } from '@neo4j-ndl/react';
import { Messages } from '../../types';
import IconButtonWithToolTip from '../UI/IconButtonToolTip';
import { tooltips } from '../../utils/Constants';

interface IconProps {
  closeChatBot: () => void;
  deleteOnClick?: () => void;
  messages: Messages[];
}

const IconsPlacement: React.FC<IconProps> = ({ closeChatBot, deleteOnClick, messages }) => {
  return (
    <div className='flex items-end justify-end'>
      <ChatModeToggle />
      <Flex flexDirection='row' gap='2'>
      <IconButtonWithToolTip
        text={tooltips.clearChat}
        aria-label='Remove chat history'
        clean
        onClick={deleteOnClick}
        disabled={messages.length === 1}
        placement='left'
        label={tooltips.clearChat}
      >
        <TrashIconOutline />
      </IconButtonWithToolTip>
      <IconButton  aria-label='Remove chatbot' clean onClick={closeChatBot}>
        <XMarkIconOutline />
      </IconButton></Flex>
      
    </div>
  );
};

export default IconsPlacement;
