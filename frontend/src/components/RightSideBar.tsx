import { Drawer, LoadingSpinner } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { useState } from 'react';
import { UserCredentials, Messages } from '../types';
import { ArchiveBoxXMarkIconOutline } from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from './ButtonWithToolTip';
import { clearChatAPI } from '../services/QnaAPI';
import { useCredentials } from '../context/UserCredentials';

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
      console.log('res', response);
      if (response.data.status === 'Success') {
        setMessages([
          {
            datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
            id: 2,
            message:
              ' Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
            sources: ['https://neo4j.com/'],
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
      closeable={true}
      position='right'
      onExpandedChange={function Ha(expanded) {
        if (!expanded) {
          closeChatBot();
        }
      }}
      key={'rightdrawer'}
      className='grow'
    >
      <ButtonWithToolTip
        text='Clear Chat history'
        onClick={deleteOnClick}
        size='medium'
        clean
        placement='right'
        disabled={messages.length === 1}
      >
        <ArchiveBoxXMarkIconOutline className='n-size-token-7' style={{ padding: '2px' }} />
      </ButtonWithToolTip>
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
