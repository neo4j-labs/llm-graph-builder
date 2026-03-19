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
import { SpotlightProvider } from '@neo4j-ndl/react';
import { envConnectionAPI } from '../../services/ConnectAPI';
import { showErrorToast } from '../../utils/Toasts';

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
  const resolveConnectionFromBackend = useCallback(async (): Promise<boolean> => {
    try {
      const backendApiResponse = await envConnectionAPI();
      const connectionData = backendApiResponse.data;
      if (connectionData.data && connectionData.status === 'Success') {
        const credentials: UserCredentials = {
          uri: connectionData.data.uri,
          connection: 'backendApi',
          email: '',
        };
        setUserCredentials(credentials);
        setConnectionStatus(Boolean(connectionData.data.graph_connection));
        setShowDisconnectButton(true);
        if (chatMessages.length) {
          setMessages(chatMessages);
        }
        return true;
      }
      if (!connectionData.data && connectionData.status === 'Success') {
        const storedCredentials = localStorage.getItem('neo4j.connection');
        if (storedCredentials) {
          const parsed = JSON.parse(storedCredentials) as UserCredentials;
          parsed.password = atob(parsed.password as string);
          setUserCredentials(parsed);
          setConnectionStatus(Boolean(parsed.connection === 'connectAPI'));
          setShowDisconnectButton(true);
          if (chatMessages.length) {
            setMessages(chatMessages);
          }
          return true;
        }
      }
    } catch (_err) {
      const message =
        _err instanceof Error ? _err.message : 'Unable to reach the backend. Please check your connection.';
      showErrorToast(message);
    }
    return false;
  }, [chatMessages, setUserCredentials, setConnectionStatus, setShowDisconnectButton, setMessages]);

  const initialiseConnection = useCallback(async () => {
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
        if (chatMessages.length) {
          setMessages(chatMessages);
        }
      } else {
        const resolved = await resolveConnectionFromBackend();
        if (!resolved) {
          setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
        }
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
      setShowDisconnectButton(true);
      if (chatMessages.length) {
        setMessages(chatMessages);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [chatMessages, setUserCredentials, setConnectionStatus, setMessages, resolveConnectionFromBackend]);

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
      showErrorToast(error instanceof Error ? error.message : 'Error clearing chat history');
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
        <SpotlightProvider>
          <FileContextProvider>
            <MessageContextWrapper>
              <ChatContent chatMessages={chatMessages} />
            </MessageContextWrapper>
          </FileContextProvider>
        </SpotlightProvider>
      </UserCredentialsWrapper>
    </ThemeWrapper>
  );
};
export default ChatOnlyComponent;
