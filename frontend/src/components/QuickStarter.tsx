import Header from './Layout/Header';
import React from 'react';
import PageLayout from './Layout/PageLayout';
import { FileContextProvider } from '../context/UsersFiles';
import UserCredentialsWrapper from '../context/UserCredentials';
import AlertContextWrapper from '../context/Alert';
import { MessageContextWrapper } from '../context/UserMessages';
import GraphWrapper from '../context/GraphWrapper';

const QuickStarter: React.FunctionComponent = () => {
  return (
    <UserCredentialsWrapper>
      <FileContextProvider>
        <GraphWrapper>
          <MessageContextWrapper>
            <AlertContextWrapper>
              <Header />
              <PageLayout />
            </AlertContextWrapper>
          </MessageContextWrapper>
        </GraphWrapper>
      </FileContextProvider>
    </UserCredentialsWrapper>
  );
};
export default QuickStarter;
