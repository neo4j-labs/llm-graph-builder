import { ExpandIcon, TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import { IconButton } from '@neo4j-ndl/react';
import { Messages } from '../../types';

interface IconProps {
  closeChatBot: () => void;
  deleteOnClick: () => void;
  messages: Messages[];
  isFullscreen: boolean;
  toggleToFullScreen?: () => void;
}

const IconsPlacement: React.FC<IconProps> = ({
  closeChatBot,
  deleteOnClick,
  messages,
  isFullscreen,
  toggleToFullScreen,
}) => {
  return (
    <div className='flex items-end justify-end'>
      <IconButton
        aria-label='Toggle small frame'
        clean
        onClick={toggleToFullScreen}
        aria-pressed={isFullscreen}
        disabled={messages.some((msg) => msg.isTyping || msg.isLoading)}
      >
        <ExpandIcon />
      </IconButton>
      <IconButton aria-label='Remove chat history' clean onClick={deleteOnClick} disabled={messages.length === 1}>
        <TrashIconOutline />
      </IconButton>
      <IconButton aria-label='Remove chatbot' clean onClick={closeChatBot}>
        <XMarkIconOutline />
      </IconButton>
    </div>
  );
};

export default IconsPlacement;
