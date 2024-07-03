import { TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import ChatModeToggle from './ChatModeToggle';
import { Box, IconButton } from '@neo4j-ndl/react';
import { Messages } from '../../types';
import IconButtonWithToolTip from '../UI/IconButtonToolTip';
import { tooltips } from '../../utils/Constants';

interface IconProps {
  closeChatBot: () => void;
  deleteOnClick?: () => void;
  messages: Messages[];
}

const ExpandedChatButtonContainer: React.FC<IconProps> = ({ closeChatBot, deleteOnClick, messages }) => {
  return (
    <div className='flex items-end justify-end'>
      <ChatModeToggle />
      <Box className='!h-[48px] mx-2'>
        <IconButtonWithToolTip
          text={tooltips.clearChat}
          aria-label='Remove chat history'
          clean
          onClick={deleteOnClick}
          disabled={messages.length === 1}
          placement='bottom'
          label={tooltips.clearChat}
        >
          <TrashIconOutline />
        </IconButtonWithToolTip>
        <IconButton aria-label='Remove chatbot' clean onClick={closeChatBot}>
          <XMarkIconOutline />
        </IconButton>
      </Box>
    </div>
  );
};

export default ExpandedChatButtonContainer;
