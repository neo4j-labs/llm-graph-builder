import { MessageContextWrapper, useMessageContext } from '../../context/UserMessages';
import UserCredentialsWrapper, { useCredentials } from '../../context/UserCredentials';
import Chatbot from './Chatbot';
import { FileContextProvider } from '../../context/UsersFiles';
import { useEffect, useState, useCallback } from 'react';
import ConnectionModal from '../Popups/ConnectionModal/ConnectionModal';
import { clearChatAPI } from '../../services/QnaAPI';
import { connectionState, Messages, UserCredentials } from '../../types';
import { useLocation } from 'react-router';
import Header from '../Layout/Header';

interface chatProp {
  chatMessages: Messages[];
  isLoading: boolean;
}
const ChatContent: React.FC<chatProp> = ({ chatMessages, isLoading }) => {
  const date = new Date();
  const { clearHistoryData, messages, setMessages, setClearHistoryData } = useMessageContext();
  const { setUserCredentials, setConnectionStatus, connectionStatus } = useCredentials();
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });

  const initialiseConnection = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uri = urlParams.get('uri');
    const user = urlParams.get('user');
    const encodedPassword = urlParams.get('password');
    const database = urlParams.get('database');
    const port = urlParams.get('port');
    const openModel = urlParams.get('open') === 'true';
    if (openModel || !(uri && user && encodedPassword && database && port)) {
      setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
    } else {
      const credentialsForAPI = { uri, userName: user, password: atob(atob(encodedPassword)), database, port };
      setUserCredentials({ ...credentialsForAPI });
      setConnectionStatus(true);
      setMessages(chatMessages);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [connectionStatus, setUserCredentials]);

  useEffect(() => {
    initialiseConnection();
  }, [connectionStatus]);

  const handleConnectionSuccess = () => {
    setConnectionStatus(true);
    setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('openModal');
    window.history.replaceState({}, document.title, `${window.location.pathname}?${urlParams.toString()}`);
  };
  const deleteOnClick = async () => {
    try {
      setClearHistoryData(true);
      const response = await clearChatAPI(
        JSON.parse(localStorage.getItem('neo4j.connection') || '{}') as UserCredentials,
        sessionStorage.getItem('session_id') ?? ''
      );
      if (response.data.status !== 'Success') {
        setClearHistoryData(false);
      }
    } catch (error) {
      console.log(error);
      setClearHistoryData(false);
    }
  };
  useEffect(() => {
    if (clearHistoryData) {
      setMessages([
        {
          datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
          id: 2,
          modes: {
            'graph+vector+fulltext': {
              message:
                'Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
            },
          },
          user: 'chatbot',
          currentMode: 'graph+vector+fulltext',
        },
      ]);
      setClearHistoryData(false);
    }
  }, [clearHistoryData]);

  return (
    <>
      <ConnectionModal
        open={openConnection.openPopUp && !connectionStatus}
        setOpenConnection={setOpenConnection}
        setConnectionStatus={setConnectionStatus}
        isVectorIndexMatch={false}
        chunksExistsWithoutEmbedding={false}
        chunksExistsWithDifferentEmbedding={false}
        onSuccess={handleConnectionSuccess}
        isChatOnly={true}
      />
      {
        <div>
          <Header chatOnly={true} deleteOnClick={deleteOnClick} setOpenConnection={setOpenConnection} />
          <div>
            <Chatbot
              isFullScreen
              isChatOnly
              messages={messages}
              setMessages={setMessages}
              clear={clearHistoryData}
              isLoading={isLoading}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>
      }
    </>
  );
};
const ChatOnlyComponent: React.FC = () => {
  const location = useLocation();
  const date = new Date();
  const message = [
    {
      datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      id: 2,
      modes: {
        'graph+vector+fulltext': {
          message:
            'Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
        },
      },
      user: 'chatbot',
      currentMode: 'graph+vector+fulltext',
    },
  ];
  console.log('isloading', location.state)
  return (
    <UserCredentialsWrapper>
      <FileContextProvider>
        <MessageContextWrapper>
          <ChatContent chatMessages={location ? location.state.messages as Messages[] : message} isLoading={location.state.isLoading} />
        </MessageContextWrapper>
      </FileContextProvider>
    </UserCredentialsWrapper>
  );
};

export default ChatOnlyComponent;
