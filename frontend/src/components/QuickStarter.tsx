import Header from './Layout/Header';
import React, { useState } from 'react';
import { ThemeWrapperContext } from '../context/ThemeWrapper';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';

const QuickStarter: React.FunctionComponent = () => {
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
};
export default QuickStarter;
