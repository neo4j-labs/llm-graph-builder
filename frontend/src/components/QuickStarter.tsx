import Header from './Layout/Header';
import React, { useState } from 'react';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';
import AlertContextWrapper from '../context/Alert';
import { MessageContextWrapper } from '../context/UserMessages';

const QuickStarter: React.FunctionComponent = () => {
  const [showSettingsModal, setshowSettingsModal] = useState<boolean>(false);
  const openSettingsModal = () => {
    setshowSettingsModal(true);
  };
  const closeSettingModal = () => {
    setshowSettingsModal(false);
  };

  return (
    <UserCredentialsWrapper>
      <FileContextProvider>
        <MessageContextWrapper>
            <AlertContextWrapper>
              <Header />
              <PageLayout
                openSettingsDialog={openSettingsModal}
                isSettingPanelExpanded={showSettingsModal}
                closeSettingModal={closeSettingModal}
              />
            </AlertContextWrapper>
        </MessageContextWrapper>
      </FileContextProvider>
    </UserCredentialsWrapper>
  );
};
export default QuickStarter;
