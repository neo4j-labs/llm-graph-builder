import Header from './Layout/Header';
import React from 'react';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';
import AlertContextWrapper from '../context/Alert';
import { MessageContextWrapper } from '../context/UserMessages';

const QuickStarter: React.FunctionComponent = () => {
  return (
    <UserCredentialsWrapper>
      <FileContextProvider>
        <MessageContextWrapper>
          <AlertContextWrapper>
            <Header />
            <PageLayout />
          </AlertContextWrapper>
        </MessageContextWrapper>
      </FileContextProvider>
    </UserCredentialsWrapper>
  );
};
export default QuickStarter;
