import React, { useEffect, useRef } from 'react';
import Chatbot from './Chatbot';
import { Messages } from '../types';
import { postMessageToFullscreen, saveStateToStorage } from '../utils/Utils';
import { useMessageContext } from '../context/UserMessages';

const ChatbotPreview: React.FC = () => {
  const { messages, setMessages, clearData } = useMessageContext();
  const fullScreenWindowRef = useRef<Window | null>(null);
  useEffect(() => {
    // Retrieve the state from sessionStorage
    const storedState = sessionStorage.getItem('rightSidebarState');
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      setMessages(parsedState.messages);
    }
    // Function to handle messages from the parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return; // Ignore messages from different origins
      }
      if (event.data.type === 'updateState' && event.data.data) {
        const { messages } = event.data.data;
        setMessages(messages);
      }
    };
    // Listen for messages from the parent window
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === 'rightSidebarState'
      ) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIsLoading = (messages: Messages[]) => {
    return messages.some((msg) => msg.isTyping || msg.isLoading);
  };
  return (
    <div className="fullscreen-chatbot">
      <Chatbot
        messages={messages}
        setMessages={setMessages}
        broadcastMessages={(newMessages: Messages[]) =>{
          saveStateToStorage(newMessages, clearData)
          postMessageToFullscreen(newMessages,clearData,fullScreenWindowRef);
        }}
        clear={false}
        isLoading={getIsLoading(messages)}
        fullScreen={true}
      />
    </div>
  );
};
export default ChatbotPreview;