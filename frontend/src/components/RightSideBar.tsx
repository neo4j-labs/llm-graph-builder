import { Drawer, LoadingSpinner, Modal } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { useState } from 'react';
import { UserCredentials, Messages } from '../types';
import { clearChatAPI } from '../services/QnaAPI';
import { useCredentials } from '../context/UserCredentials';
import { createPortal } from 'react-dom';
import IconsPlacement from './Layout/Icons';

interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
  openChatBot: () => void;
}
const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot, openChatBot }) => {
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
      const response = await clearChatAPI(
        userCredentials as UserCredentials,
        sessionStorage.getItem('session_id') ?? ''
      );
      if (response.data.status === 'Success') {
        setMessages([
          {
            datetime: formattedDateTime,
            id: 2,
            message:
              ' Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
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

  const toggleToSmallScreen = () => {
    setIsFullScreen(!isFullScreen);
    closeChatBot();
  };

  const toggleToFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    openChatBot();
  };

  return (
    <>
      <Drawer
        expanded={showChatBot}
        isResizeable={false}
        type='push'
        position='right'
        key='rightdrawer'
        className='grow'
        closeable={false}
      >
        <IconsPlacement
          closeChatBot={closeChatBot}
          deleteOnClick={deleteOnClick}
          messages={messages}
          isFullscreen={isFullScreen}
          toggleToSmallScreen={toggleToSmallScreen}
        />
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
      {isFullScreen &&
        createPortal(
          <Modal
            modalProps={{
              id: 'Chatbot',
              className: 'n-p-token-4 n-bg-neutral-10 n-rounded-lg',
            }}
            onClose={toggleToFullScreen}
            open={isFullScreen}
            size='unset'
          >
            {clearHistoryData ? (
              <LoadingSpinner size='large' className='top-72 left-52' />
            ) : (
              <>
                <IconsPlacement
                  closeChatBot={toggleToFullScreen}
                  deleteOnClick={deleteOnClick}
                  messages={messages}
                  isFullscreen={isFullScreen}
                  toggleToFullScreen={toggleToFullScreen}
                />
                <Chatbot
                  messages={messages}
                  setMessages={setMessages}
                  clear={clearHistoryData}
                  isLoading={getIsLoading(messages)}
                  fullScreen={isFullScreen}
                />
              </>
            )}
          </Modal>,
          document.body
        )}
    </>
  );
};
export default RightSideBar;
