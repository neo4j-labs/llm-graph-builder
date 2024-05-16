import { Drawer, LoadingSpinner } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { useState } from 'react';
import { UserCredentials, Messages } from '../types';
import { ExpandIcon, ShrinkIcon, TrashIconOutline } from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';
import { clearChatAPI } from '../services/QnaAPI';
import { useCredentials } from '../context/UserCredentials';

interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
}
const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot }) => {
  const date = new Date();
  const formattedDateTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  const [messages, setMessages] = useState<Messages[]>([
    { ...chatbotmessages.listMessages[1], datetime: formattedDateTime },
  ]);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
  };
  const deleteOnClick = async () => {
    try {
      setClearHistoryData(true);
      const response = await clearChatAPI(userCredentials as UserCredentials, sessionStorage.getItem('session_id') ?? '');
      if (response.data.status === 'Success') {
        setMessages([
          {
            datetime: formattedDateTime,
            id: 2,
            message: ' Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
            sources: ['https://neo4j.com/'],
            user: 'chatbot',
          },
        ]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setClearHistoryData(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullScreen(!isFullScreen);
    alert('hello')
  };

  // const toggleFullscreen = () => {
  //   setIsFullScreen(!isFullScreen);
  //   const chatbotWindow = window.open(
  //     '',
  //     '_blank',
  //     'width=600,height=600,top=100,left=100'
  //   );
  //   if (chatbotWindow) {
  //     chatbotWindow.document.write(``);
  //     chatbotWindow.document.close();
  //   }
  // };

  return (
    <Drawer
      expanded={showChatBot}
      isResizeable={false}
      type='push'
      closeable={true}
      position='right'
      onExpandedChange={(expanded) => {
        if (!expanded) {
          closeChatBot();
        }
      }}
      key='rightdrawer'
      className='grow'
    >
      <div className='inline-flex gap-x-1' style={{ display: 'flex', flexGrow: 0, alignItems: 'center', gap: '6px' }}>
        <ButtonWithToolTip
          text='Clear Chat history'
          onClick={deleteOnClick}
          size='medium'
          clean
          placement='bottom'
          disabled={messages.length === 1}
        >
          <TrashIconOutline className='n-size-token-7' style={{ padding: '2px' }} />
        </ButtonWithToolTip>
        <ButtonWithToolTip
          text='Toggle minimize frame'
          onClick={toggleFullscreen}
          size='medium'
          clean
          placement='right'
        >
          {isFullScreen ? (
            <ShrinkIcon className="text-palette-neutral-text-weak h-5 w-5" />
          ) : (
            <ExpandIcon className="text-palette-neutral-text-weak h-5 w-5" />
          )}
        </ButtonWithToolTip>
      </div>
      <Drawer.Body className='!overflow-y-hidden !px-0'>
        {clearHistoryData ? (
          <LoadingSpinner size='large' className='top-72 left-52' />
        ) : (
          <Chatbot
            messages={messages}
            setMessages={setMessages}
            clear={clearHistoryData}
            isLoading={getIsLoading(messages)}
          />
        )}
      </Drawer.Body>
    </Drawer>
  );
};
export default RightSideBar;