import Header from './Layout/Header';
import React, { useState } from 'react';
import { ThemeWrapperContext } from '../context/ThemeWrapper';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';
import AlertContextWrapper from '../context/Alert';

const QuickStarter: React.FunctionComponent = () => {
  const themeUtils = React.useContext(ThemeWrapperContext);
  const [themeMode, setThemeMode] = useState<string>(themeUtils.colorMode);
  const [showSettingsModal, setshowSettingsModal] = useState<boolean>(false);

  const toggleColorMode = () => {
    setThemeMode((prevThemeMode) => {
      return prevThemeMode === 'light' ? 'dark' : 'light';
    });
    themeUtils.toggleColorMode();
  };
  const openSettingsModal = () => {
    setshowSettingsModal(true);
  };
  const closeSettingModal = () => {
    setshowSettingsModal(false);
  };
  return (
    <UserCredentialsWrapper>
      <FileContextProvider>
        <AlertContextWrapper>
          <Header themeMode={themeMode} toggleTheme={toggleColorMode} openSettingsModal={openSettingsModal} />
          <PageLayout isSettingPanelExpanded={showSettingsModal} closeSettingModal={closeSettingModal} />
        </AlertContextWrapper>
      </FileContextProvider>
    </UserCredentialsWrapper>
  );
};
export default QuickStarter;
