import React, { useState, useEffect } from 'react';
import { Drawer, LoadingSpinner } from '@neo4j-ndl/react';
import Chatbot from '../Chatbot';
import { Messages } from '../../types';
import chatbotmessages from '../../assets/ChatbotMessages.json';
interface DrawerChatbotProps {
  isExpanded: boolean;
  clearHistoryData: boolean;
}
const DrawerChatbot: React.FC<DrawerChatbotProps> = ({ isExpanded, clearHistoryData }) => {
  const date = new Date();
  const [messages, setMessages] = useState<Messages[]>([
    { ...chatbotmessages.listMessages[1], datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` },
  ]);

  useEffect(() => {
    if (!clearHistoryData) {
      setMessages([
        {
          datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
          id: 2,
          message:
            ' Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
          user: 'chatbot',
        },
      ]);
    }
  }, [clearHistoryData]);
  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
  };
  return (
    <div className='flex min-h-[calc(-58px+100vh)] relative'>
      <Drawer expanded={isExpanded} closeable={false} position='right' type='push'>
        <Drawer.Body className='!overflow-hidden'>
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
    </div>
  );
};
export default DrawerChatbot;
