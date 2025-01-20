import { Drawer } from '@neo4j-ndl/react';
import Chatbot from '../ChatBot/Chatbot';
import { DrawerChatbotProps, Messages } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
import { useLocation } from 'react-router';
import { useEffect } from 'react';
import { useCredentials } from '../../context/UserCredentials';

const DrawerChatbot: React.FC<DrawerChatbotProps> = ({ isExpanded, clearHistoryData, messages, connectionStatus }) => {
  const { setMessages, isDeleteChatLoading } = useMessageContext();
  const { setUserCredentials, setIsGCSActive, setGdsActive, setIsReadOnlyUser } = useCredentials();
  const location = useLocation();

  useEffect(() => {
    if (location && location.state && Array.isArray(location.state)) {
      setMessages(location.state);
    } else if (location && location.state && Object.prototype.toString.call(location.state) === '[object Object]') {
      setUserCredentials(location.state.credential);
      setIsGCSActive(location.state.isGCSActive);
      setGdsActive(location.state.isgdsActive);
      setIsReadOnlyUser(location.state.isReadOnlyUser);
    }
  }, [location]);

  const getIsLoading = (messages: Messages[]) => {
    return messages.length > 1 ? messages.some((msg) => msg.isTyping || msg.isLoading) : false;
  };
  return (
    <div className='flex min-h-[calc(-58px+100vh)] relative w-full'>
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
