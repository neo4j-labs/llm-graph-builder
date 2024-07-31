import { Drawer } from '@neo4j-ndl/react';
import Chatbot from '../ChatBot/Chatbot';
import { DrawerChatbotProps, Messages } from '../../types';
import { useMessageContext } from '../../context/UserMessages';

const DrawerChatbot: React.FC<DrawerChatbotProps> = ({ isExpanded, clearHistoryData, messages }) => {
  const { setMessages } = useMessageContext();

  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
  };
  return (
    <div className='flex min-h-[calc(-58px+100vh)] relative'>
      <Drawer expanded={isExpanded} closeable={false} position='right' type='push' className='!pt-0'>
        <Drawer.Body className='!overflow-hidden !pr-0'>
          <Chatbot
            isFullScreen={false}
            messages={messages}
            setMessages={setMessages}
            clear={clearHistoryData}
            isLoading={getIsLoading(messages)}
          />
        </Drawer.Body>
      </Drawer>
    </div>
  );
};
export default DrawerChatbot;
