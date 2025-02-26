import { TrashIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import ChatModeToggle from './ChatModeToggle';
import { IconButton } from '@neo4j-ndl/react';
import { IconProps } from '../../types';
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';
import { tooltips } from '../../utils/Constants';
import { memo, useRef, useState } from 'react';
import { RiChatSettingsLine } from 'react-icons/ri';

const ExpandedChatButtonContainer: React.FC<IconProps> = ({ closeChatBot, deleteOnClick, messages }) => {
  const chatAnchor = useRef<HTMLDivElement>(null);
  const [showChatModeOption, setshowChatModeOption] = useState<boolean>(false);
  return (
    <div className='flex items-end justify-end'>
      <ChatModeToggle
        closeHandler={(_, reason) => {
          if (reason.type === 'backdropClick') {
            setshowChatModeOption(false);
          }
        }}
        open={showChatModeOption}
        menuAnchor={chatAnchor}
        isRoot={false}
      />
      <div className='h-[48px]! mx-2 flex! items-center'>
        <div ref={chatAnchor}>
          <IconButtonWithToolTip
            onClick={() => {
              setshowChatModeOption(true);
            }}
            clean
            text='Chat mode'
            placement='bottom'
            label='Chat mode'
          >
            <RiChatSettingsLine />
          </IconButtonWithToolTip>
        </div>
        <IconButtonWithToolTip
          text={tooltips.clearChat}
          aria-label='Remove chat history'
          clean
          onClick={deleteOnClick}
          disabled={messages.length === 1}
          placement={'left'}
          label={tooltips.clearChat}
        >
          <TrashIconOutline />
        </IconButtonWithToolTip>
        <IconButton ariaLabel='Remove chatbot' isClean={true} onClick={closeChatBot}>
          <XMarkIconOutline className='n-size-token-7' />
        </IconButton>
      </div>
    </div>
  );
};

export default memo(ExpandedChatButtonContainer);
