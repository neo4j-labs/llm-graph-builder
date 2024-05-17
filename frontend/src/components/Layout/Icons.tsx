import { ExpandIcon, ShrinkIcon, TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import { IconButton } from '@neo4j-ndl/react';
import { Messages } from '../../types';

interface IconProps {
  closeChatBot: () => void;
  deleteOnClick: () => void;
  messages: Messages[];
  isFullscreen: boolean;
  toggleToFullScreen?: () => void;
  toggleToSmallScreen?: () => void;
}

const IconsPlacement: React.FC<IconProps> = ({
  closeChatBot,
  deleteOnClick,
  messages,
  isFullscreen,
  toggleToFullScreen,
  toggleToSmallScreen,
}) => {
  return (
    <div className='flex items-end justify-end'>
      {isFullscreen ? (
        <IconButton aria-label='Toggle fullscreen frame' clean onClick={toggleToFullScreen} aria-pressed={isFullscreen}>
          <ShrinkIcon />
        </IconButton>
      ) : (
        <IconButton aria-label='Toggle small frame' clean onClick={toggleToSmallScreen} aria-pressed={isFullscreen}>
          <ExpandIcon />
        </IconButton>
      )}
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
