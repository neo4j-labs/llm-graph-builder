import { Drawer } from '@neo4j-ndl/react';
import Chatbot from './Chatbot';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { useState } from 'react';
import { Messages } from '../types';

interface RightSideBarProps {
  showChatBot: boolean;
  closeChatBot: () => void;
}

const RightSideBar: React.FC<RightSideBarProps> = ({ showChatBot, closeChatBot }) => {
  const date = new Date();
  const [messages, setMessages] = useState<Messages[]>([
    { ...chatbotmessages.listMessages[1], datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` },
  ]);

  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
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
      <Drawer.Body className='!overflow-y-hidden !px-0'>
        <Chatbot
          messages={messages}
          setMessages={setMessages}
          isLoading={getIsLoading(messages)}
        ></Chatbot>
      </Drawer.Body>
    </Drawer>
  );
};
export default RightSideBar;
