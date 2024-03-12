import Header from './Layout/Header';
import React, { useState } from 'react';
import { ThemeWrapperContext } from '../context/ThemeWrapper';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';
import ChatBotContextWrapper, { useChatBotWrapper } from '../context/ChatBotWrapper';

const QuickStarter: React.FunctionComponent = () => {
  const {showChatBot,}=useChatBotWrapper()
  const themeUtils = React.useContext(ThemeWrapperContext);
  const [themeMode, setThemeMode] = useState<string>(themeUtils.colorMode);

  const toggleColorMode = () => {
    setThemeMode((prevThemeMode) => {
      return prevThemeMode === 'light' ? 'dark' : 'light';
    });
    themeUtils.toggleColorMode();
  };

  return (
    <ChatBotContextWrapper>
      <FileContextProvider>
        <UserCredentialsWrapper>
          <Header themeMode={themeMode} toggleTheme={toggleColorMode} />
          <PageLayout />
        </UserCredentialsWrapper>
      </FileContextProvider>
    </ChatBotContextWrapper>
  );
};
export default QuickStarter;
