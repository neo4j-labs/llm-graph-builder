import { useEffect, useState, useCallback, useReducer } from 'react';
import { useLocation } from 'react-router';
import { MessageContextWrapper, useMessageContext } from '../../context/UserMessages';
import UserCredentialsWrapper, { useCredentials } from '../../context/UserCredentials';
import { FileContextProvider } from '../../context/UsersFiles';
import Chatbot from './Chatbot';
import ConnectionModal from '../Popups/ConnectionModal/ConnectionModal';
import Header from '../Layout/Header';
import { clearChatAPI } from '../../services/QnaAPI';
import { ChatProps, connectionState, Messages, UserCredentials } from '../../types';
import { getIsLoading } from '../../utils/Utils';
import ThemeWrapper from '../../context/ThemeWrapper';

const ChatContent: React.FC<ChatProps> = ({ chatMessages }) => {
  const { clearHistoryData, messages, setMessages, setClearHistoryData, setIsDeleteChatLoading, isDeleteChatLoading } =
    useMessageContext();
  const { setUserCredentials, setConnectionStatus, connectionStatus, setShowDisconnectButton } = useCredentials();
  const [showBackButton, setShowBackButton] = useReducer((state) => !state, false);
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });
  /**
   * Initializes connection settings based on URL parameters.
   */
  const initialiseConnection = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uri = urlParams.get('uri');
    const user = urlParams.get('user');
    const encodedPassword = urlParams.get('password');
    const database = urlParams.get('database');
    const port = urlParams.get('port');
    const email = urlParams.get('email');
    const openModal = urlParams.get('open') === 'true';
    const connectionStatus = urlParams.get('connectionStatus') === 'true';
    if (openModal || !(uri && user && encodedPassword && database && port)) {
      if (connectionStatus) {
        setShowBackButton();
        setConnectionStatus(connectionStatus);
        setMessages(chatMessages);
      } else {
        setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
      }
    } else {
      const credentialsForAPI: UserCredentials = {
        uri,
        userName: user,
        password: atob(atob(encodedPassword)),
        database,
        port,
        email: email ?? '',
      };
      setShowBackButton();
      setUserCredentials(credentialsForAPI);
      setConnectionStatus(true);
      setMessages(chatMessages);
      // Remove query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [chatMessages, setUserCredentials, setConnectionStatus, setMessages]);

  useEffect(() => {
    initialiseConnection();
  }, [initialiseConnection]);
  /**
   * Handles successful connection establishment.
   */
  const handleConnectionSuccess = () => {
    setConnectionStatus(true);
    setShowDisconnectButton(true);
    setOpenConnection((prev) => ({ ...prev, openPopUp: false }));
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('openModal');
    window.history.replaceState({}, document.title, `${window.location.pathname}?${urlParams.toString()}`);
  };
  /**
   * Clears chat history by calling the API.
   */
  const deleteOnClick = async () => {
    try {
      setClearHistoryData(true);
      setIsDeleteChatLoading(true);
      // const credentials = JSON.parse(localStorage.getItem('neo4j.connection') || '{}') as UserCredentials;
      const sessionId = sessionStorage.getItem('session_id') || '';
      const response = await clearChatAPI(sessionId);
      setIsDeleteChatLoading(false);
      if (response.data.status !== 'Success') {
        setClearHistoryData(false);
      }
    } catch (error) {
      setIsDeleteChatLoading(false);
      console.error('Error clearing chat history:', error);
      setClearHistoryData(false);
    }
  };
  useEffect(() => {
    if (clearHistoryData) {
      const currentDateTime = new Date();
      setMessages([
        {
          datetime: `${currentDateTime.toLocaleDateString()} ${currentDateTime.toLocaleTimeString()}`,
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
  }, [clearHistoryData, setMessages]);
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
      <div>
        <Header
          chatOnly={true}
          deleteOnClick={deleteOnClick}
          setOpenConnection={setOpenConnection}
          showBackButton={showBackButton}
        />
        <div>
          <Chatbot
            isFullScreen
            isChatOnly
            messages={messages}
            setMessages={setMessages}
            clear={clearHistoryData}
            isLoading={getIsLoading(messages)}
            connectionStatus={connectionStatus}
            isDeleteChatLoading={isDeleteChatLoading}
          />
        </div>
      </div>
    </>
  );
};
/**
 * ChatOnlyComponent
 * Wrapper component to provide necessary context and initialize chat functionality.
 */
const ChatOnlyComponent: React.FC = () => {
  const location = useLocation();
  const chatMessages = (location.state?.messages as Messages[]) || [];
  return (
    <ThemeWrapper>
      <UserCredentialsWrapper>
        <FileContextProvider>
          <MessageContextWrapper>
            <ChatContent chatMessages={chatMessages} />
          </MessageContextWrapper>
        </FileContextProvider>
      </UserCredentialsWrapper>
    </ThemeWrapper>
  );
};
export default ChatOnlyComponent;
