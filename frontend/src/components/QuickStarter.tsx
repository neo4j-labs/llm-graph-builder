import Header from './Layout/Header';
import React, { useState } from 'react';
import { ThemeWrapperContext } from '../context/ThemeWrapper';
import PageLayout from './Layout/PageLayout';

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
    <>
      <Header themeMode={themeMode} toggleTheme={toggleColorMode} openSettingsModal={openSettingsModal} />
      <PageLayout isSettingPanelExpanded={showSettingsModal} closeSettingModal={closeSettingModal} />
    </>);
};
export default QuickStarter;
