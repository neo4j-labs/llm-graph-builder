import { Drawer, LoadingSpinner } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { useState } from 'react';
import { UserCredentials, Messages } from '../types';
import { clearChatAPI } from '../services/QnaAPI';
import { useCredentials } from '../context/UserCredentials';
import IconsPlacement from './IconsPlacement';

interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
}

const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot }) => {
  const date = new Date();
  const [messages, setMessages] = useState<Messages[]>([
    { ...chatbotmessages.listMessages[1], datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` },
  ]);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const { userCredentials } = useCredentials();

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
            datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
            id: 2,
            message:
              ' Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
            user: 'chatbot',
          },
        ]);
        setClearHistoryData(false);
      }
    } catch (error) {
      console.log(error);
      setClearHistoryData(false);
    }
  };

  return (
    <Drawer
      expanded={showChatBot}
      isResizeable={false}
      type='push'
      closeable={false}
      position='right'
      key={'rightdrawer'}
      className='grow'
    >
      <IconsPlacement closeChatBot={closeChatBot} deleteOnClick={deleteOnClick} messages={messages} />
      <Drawer.Body className='!overflow-y-hidden !px-0'>
        {clearHistoryData ? (
          <LoadingSpinner size='large' className='top-72 left-52' />
        ) : (
          <Chatbot
            messages={messages}
            setMessages={setMessages}
            clear={clearHistoryData}
            isLoading={getIsLoading(messages)}
          ></Chatbot>
        )}
      </Drawer.Body>
    </Drawer>
  );
};
export default RightSideBar;