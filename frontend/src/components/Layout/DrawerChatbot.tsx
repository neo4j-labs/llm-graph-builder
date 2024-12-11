import { Drawer } from '@neo4j-ndl/react';
import Chatbot from '../ChatBot/Chatbot';
import { DrawerChatbotProps, Messages } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
import { useLocation } from 'react-router';
import { useEffect } from 'react';

const DrawerChatbot: React.FC<DrawerChatbotProps> = ({ isExpanded, clearHistoryData, messages, connectionStatus }) => {
  const { setMessages, isDeleteChatLoading } = useMessageContext();
  const location = useLocation();

  useEffect(() => {
    if (location && location.state) {
      setMessages(location.state);
    }
  }, [location]);

  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
  };
  return (
    <div className='flex min-h-[calc(-58px+100vh)] relative'>
      <Drawer isExpanded={isExpanded} isCloseable={false} position='right' type='push' className='!pt-0'>
        <Drawer.Body className='!overflow-hidden !pr-0'>
          <Chatbot
            isFullScreen={false}
            messages={messages}
            setMessages={setMessages}
            clear={clearHistoryData}
            isLoading={getIsLoading(messages)}
            connectionStatus={connectionStatus}
            isDeleteChatLoading={isDeleteChatLoading}
          />
        </Drawer.Body>
      </Drawer>
    </div>
  );
};
export default DrawerChatbot;
