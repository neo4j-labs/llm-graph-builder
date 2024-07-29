import { TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import ChatModeToggle from './ChatModeToggle';
import { Box, IconButton } from '@neo4j-ndl/react';
import { IconProps } from '../../types';
import IconButtonWithToolTip from '../UI/IconButtonToolTip';
import { tooltips } from '../../utils/Constants';
import { useState } from 'react';
import { RiChatSettingsLine } from 'react-icons/ri';

const ExpandedChatButtonContainer: React.FC<IconProps> = ({ closeChatBot, deleteOnClick, messages }) => {
  const [chatAnchor, setchatAnchor] = useState<HTMLElement | null>(null);
  const [showChatModeOption, setshowChatModeOption] = useState<boolean>(false);
  return (
    <div className='flex items-end justify-end'>
      <ChatModeToggle
        closeHandler={() => setshowChatModeOption(false)}
        anchorPortal={true}
        disableBackdrop={true}
        open={showChatModeOption}
        menuAnchor={chatAnchor}
      />
      <Box className='!h-[48px] mx-2'>
        <IconButtonWithToolTip
          onClick={(e) => {
            setchatAnchor(e.currentTarget);
            setshowChatModeOption(true);
          }}
          clean
          text='Chat mode'
          placement='bottom'
          label='Chat mode'
        >
          <RiChatSettingsLine />
        </IconButtonWithToolTip>
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
