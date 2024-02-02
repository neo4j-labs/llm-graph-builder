import Header from './Layout/Header';
import React, { useState } from 'react';
import { ThemeWrapperContext } from '../context/ThemeWrapper';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';

export default function QuickStarter() {
  const themeUtils = React.useContext(ThemeWrapperContext);
  const [themeMode, setThemeMode] = useState<string>(themeUtils.colorMode);

  const toggleColorMode = () => {
    setThemeMode((prevThemeMode) => {
      return prevThemeMode === 'light' ? 'dark' : 'light';
    });
    themeUtils.toggleColorMode();
  };

  return (
    <FileContextProvider>
      <UserCredentialsWrapper>
        <Header themeMode={themeMode} toggleTheme={toggleColorMode} />
        <PageLayout />
      </UserCredentialsWrapper>
    </FileContextProvider>
  );
}
