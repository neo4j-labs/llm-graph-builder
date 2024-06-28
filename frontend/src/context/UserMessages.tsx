import { createContext, useState, useContext, Dispatch, SetStateAction, FC } from 'react';
import { MessagesContextProviderProps, Messages } from '../types';
import chatbotmessages from '../assets/ChatbotMessages.json';
import { getDateTime } from '../utils/Utils';

interface MessageContextType {
  messages: Messages[] | [];
  setMessages: Dispatch<SetStateAction<Messages[]>>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

const MessageContextWrapper: FC<MessagesContextProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Messages[] | []>([
    { ...chatbotmessages.listMessages[1], datetime: getDateTime() },
  ]);

  const value: MessageContextType = {
    messages,
    setMessages,
  };
  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};
const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageContext must be used within a MessageContextWrapper');
  }
  return context;
};
export { MessageContextWrapper, useMessageContext };
