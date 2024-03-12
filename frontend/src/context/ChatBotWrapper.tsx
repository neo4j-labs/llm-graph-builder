import React, { Dispatch, SetStateAction, createContext, useContext, useState } from 'react';
interface props {
  children: React.ReactNode;
}
interface ChatbotContextProps {
  toggleChatbot: Dispatch<SetStateAction<boolean>>;
  showChatBot: boolean;
}
const ChatBotContext = createContext<ChatbotContextProps>({
  toggleChatbot: () => null,
  showChatBot: false,
});
export const useChatBotWrapper = () => {
  return useContext(ChatBotContext);
};
const ChatBotContextWrapper: React.FC<props> = (props) => {
  const [showChatBot, toggleChatbot] = useState<boolean>(false);

  return (
    <ChatBotContext.Provider
      value={{
        showChatBot,
        toggleChatbot,
      }}
    >
      {props.children}
    </ChatBotContext.Provider>
  );
};

export default ChatBotContextWrapper;
