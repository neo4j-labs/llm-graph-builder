import { createContext, useState, useContext, FC } from 'react';
import { MessagesContextProviderProps, Messages, MessageContextType } from '../types';
import { getDefaultMessage } from '../utils/Constants';

const MessageContext = createContext<MessageContextType | undefined>(undefined);

const MessageContextWrapper: FC<MessagesContextProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Messages[] | []>(getDefaultMessage);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const [isDeleteChatLoading, setIsDeleteChatLoading] = useState(false);

  const value: MessageContextType = {
    messages,
    setMessages,
    clearHistoryData,
    setClearHistoryData,
    isDeleteChatLoading,
    setIsDeleteChatLoading,
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
