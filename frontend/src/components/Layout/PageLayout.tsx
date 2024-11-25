import { lazy, Suspense, useEffect, useReducer, useState } from 'react';
import SideNav from './SideNav';
import DrawerDropzone from './DrawerDropzone';
import DrawerChatbot from './DrawerChatbot';
import Content from '../Content';
import { clearChatAPI } from '../../services/QnaAPI';
import { useCredentials } from '../../context/UserCredentials';
import { connectionState, UserCredentials } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
import { useMediaQuery } from '@mui/material';
import { useFileContext } from '../../context/UsersFiles';
import SchemaFromTextDialog from '../Popups/Settings/SchemaFromText';
import useSpeechSynthesis from '../../hooks/useSpeech';
import FallBackDialog from '../UI/FallBackDialog';
import { envConnectionAPI } from '../../services/ConnectAPI';
import { healthStatus } from '../../services/HealthStatus';

const ConnectionModal = lazy(() => import('../Popups/ConnectionModal/ConnectionModal'));

interface PageLayoutProp {
  isChatOnly?: boolean;
}

const PageLayout: React.FC<PageLayoutProp> = () => {
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });
  const largedesktops = useMediaQuery(`(min-width:1440px )`);
  const { userCredentials, connectionStatus } = useCredentials();
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(Boolean(largedesktops));
  const [isRightExpanded, setIsRightExpanded] = useState<boolean>(Boolean(largedesktops));
  const [showChatBot, setShowChatBot] = useState<boolean>(false);
  const [showDrawerChatbot, setShowDrawerChatbot] = useState<boolean>(true);
  const [showEnhancementDialog, toggleEnhancementDialog] = useReducer((s) => !s, false);
  const [shows3Modal, toggleS3Modal] = useReducer((s) => !s, false);
  const [showGCSModal, toggleGCSModal] = useReducer((s) => !s, false);
  const [showGenericModal, toggleGenericModal] = useReducer((s) => !s, false);

  const toggleLeftDrawer = () => {
    if (largedesktops) {
      setIsLeftExpanded(!isLeftExpanded);
    } else {
      setIsLeftExpanded(false);
    }
  };
  const toggleRightDrawer = () => {
    if (largedesktops) {
      setIsRightExpanded(!isRightExpanded);
    } else {
      setIsRightExpanded(false);
    }
  };

  const { messages, setClearHistoryData, clearHistoryData, setMessages } = useMessageContext();
  const { isSchema, setIsSchema, setShowTextFromSchemaDialog, showTextFromSchemaDialog } = useFileContext();
  const {
    setConnectionStatus,
    setGdsActive,
    setIsReadOnlyUser,
    setIsBackendConnected,
    setUserCredentials,
    setErrorMessage,
    setShowDisconnectButton,
    showDisconnectButton,
  } = useCredentials();
  const { cancel } = useSpeechSynthesis();


  useEffect(() => {
    async function initializeConnection() {
      const session = localStorage.getItem('neo4j.connection');
      const environment = process.env.VITE_ENV;
      const isDev = environment === 'DEV';
      // Fetch backend health status
      const responseHealth = await healthStatus();
      if (responseHealth?.data?.healthy === true || responseHealth?.data?.healthy === false) {
        setIsBackendConnected(responseHealth.data.healthy);
      } else {
        console.error('Invalid response for health status');
        setIsBackendConnected(false);
      }
      // Helper function to set the disconnect button state
      function handleDisconnectButtonState(isModalOpen: boolean) {
        if (typeof isModalOpen === 'boolean') {
          setShowDisconnectButton(isModalOpen);
          localStorage.setItem('disconnectButtonState', isModalOpen ? 'true' : 'false');
        } else {
          console.error('Invalid value for disconnect button state:', isModalOpen);
        }
      }
      // Helper function to parse and set user credentials from session
      function setUserCredentialsFromSession(neo4jConnection: string) {
        if (!neo4jConnection) {
          console.error('Invalid session data:', neo4jConnection);
          return;
        }
        try {
          const parsedConnection = JSON.parse(neo4jConnection);
          if (
            parsedConnection.uri &&
            parsedConnection.user &&
            parsedConnection.password &&
            parsedConnection.database &&
            typeof parsedConnection.uri === 'string' &&
            typeof parsedConnection.user === 'string' &&
            typeof parsedConnection.password === 'string' &&
            typeof parsedConnection.database === 'string'
          ) {
            setUserCredentials({
              uri: parsedConnection.uri,
              userName: parsedConnection.user,
              password: atob(parsedConnection.password),
              database: parsedConnection.database,
              port: parsedConnection.uri.split(':')[2],
            });
            setGdsActive(parsedConnection.isGDS || false);
            setIsReadOnlyUser(parsedConnection.isReadOnlyUser || false);
          } else {
            console.error('Invalid parsed session data:', parsedConnection);
          }
        } catch (error) {
          console.error('Failed to parse session data:', error);
        }
      }
      // Helper function to update credentials if environment values differ
      function updateSessionIfNeeded(envCredentials: UserCredentials, storedSession: string) {
        try {
          const storedCredentials = JSON.parse(storedSession);
          const isDifferent =
            envCredentials.uri !== storedCredentials.uri ||
            envCredentials.userName !== storedCredentials.user ||
            btoa(envCredentials.password) !== storedCredentials.password ||
            envCredentials.database !== storedCredentials.database;
          if (isDifferent) {
            setUserCredentials(envCredentials);
            localStorage.setItem(
              'neo4j.connection',
              JSON.stringify({
                uri: envCredentials.uri,
                user: envCredentials.userName,
                password: btoa(envCredentials.password),
                database: envCredentials.database,
                userDbVectorIndex: 384,
                isReadOnlyUser: envCredentials.isReadonlyUser,
                isGDS: envCredentials.isGds,
              })
            );
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to update session:', error);
          return false;
        }
      }
      try {
        // Handle case where session exists
        if (session) {
          if (isDev) {
            let backendApiResponse;
            try {
              backendApiResponse = await envConnectionAPI();
                const connectionData = backendApiResponse.data;
                const envCredentials = {
                  uri: connectionData.data.uri,
                  password: atob(connectionData.data.password),
                  userName: connectionData.data.user_name,
                  database: connectionData.data.database,
                  isReadonlyUser: connectionData.data.write_access,
                  isGds: connectionData.data.gds_status,
                };
                const updated = updateSessionIfNeeded(envCredentials, session);
                if (!updated) {
                  setUserCredentialsFromSession(session); // Use stored session if no update is needed
                }
                setConnectionStatus(!!connectionData.graph_connection);
                setIsBackendConnected(true);
                handleDisconnectButtonState(false);
            } catch (error) {
              console.error('Error in DEV session handling:', error);
              handleDisconnectButtonState(true);
              setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
              setErrorMessage(backendApiResponse?.data.error);
            }
          } else {
            // For PROD, prioritize the session values
            setUserCredentialsFromSession(session);
            setConnectionStatus(true);
            setIsBackendConnected(true);
            handleDisconnectButtonState(false);
          }
          return;
        }
        // Handle case where no session exists
        if (isDev) {
          try {
            const response = await envConnectionAPI();
            const connectionData = response.data.data;
            const credentials = {
              uri: connectionData.uri,
              password: atob(connectionData.password),
              userName: connectionData.user_name,
              database: connectionData.database,
              isReadonlyUser: connectionData.write_access,
              isGds: connectionData.gds_status,
            };
            setUserCredentials(credentials);
            localStorage.setItem(
              'neo4j.connection',
              JSON.stringify({
                uri: credentials.uri,
                user: credentials.userName,
                password: btoa(credentials.password),
                database: credentials.database,
                userDbVectorIndex: 384,
                isReadOnlyUser: credentials.isReadonlyUser,
                isGDS: credentials.isGds,
              })
            );
            setConnectionStatus(!!connectionData.graph_connection);
            setIsBackendConnected(true);
            handleDisconnectButtonState(false);
          } catch (error) {
            console.error('Error in DEV no-session handling:', error);
            handleDisconnectButtonState(true);
            setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
            setErrorMessage('Connection failed in DEV environment.');
          }
        } else {
          // For PROD: Open modal to manually connect
          handleDisconnectButtonState(true);
          setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
          setIsBackendConnected(false);
        }
      } catch (error) {
        // General error handling
        console.error('Error in initializeConnection:', error);
        setIsBackendConnected(false);
        setErrorMessage('Network error');
      }
    }
    initializeConnection();
  }, []);

  const deleteOnClick = async () => {
    try {
      setClearHistoryData(true);
      cancel();
      const response = await clearChatAPI(
        userCredentials as UserCredentials,
        sessionStorage.getItem('session_id') ?? ''
      );
      if (response.data.status === 'Success') {
        const date = new Date();

        setMessages([
          {
            datetime: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
            id: 2,
            modes: {
              'graph+vector+fulltext': {
                message:
                  ' Welcome to the Neo4j Knowledge Graph Chat. You can ask questions related to documents which have been completely processed.',
              },
            },
            user: 'chatbot',
            currentMode: 'graph+vector+fulltext',
          },
        ]);
      }
    } catch (error) {
      console.log(error);
      setClearHistoryData(false);
    }
  };

  return (
    <div style={{ maxHeight: 'calc(100vh - 58px)' }} className='flex overflow-hidden'>
      <Suspense fallback={<FallBackDialog />}>
        <ConnectionModal
          open={openConnection.openPopUp}
          setOpenConnection={setOpenConnection}
          setConnectionStatus={setConnectionStatus}
          isVectorIndexMatch={openConnection.vectorIndexMisMatch}
          chunksExistsWithoutEmbedding={openConnection.chunksExists}
          chunksExistsWithDifferentEmbedding={openConnection.chunksExistsWithDifferentDimension}
        />
      </Suspense>
      <SideNav
        toggles3Modal={toggleS3Modal}
        toggleGCSModal={toggleGCSModal}
        toggleGenericModal={toggleGenericModal}
        isExpanded={isLeftExpanded}
        position='left'
        toggleDrawer={toggleLeftDrawer}
      />
      <DrawerDropzone
        shows3Modal={shows3Modal}
        showGCSModal={showGCSModal}
        showGenericModal={showGenericModal}
        toggleGCSModal={toggleGCSModal}
        toggleGenericModal={toggleGenericModal}
        toggleS3Modal={toggleS3Modal}
        isExpanded={isLeftExpanded}
      />
      <SchemaFromTextDialog
        open={showTextFromSchemaDialog.show}
        onClose={() => {
          setShowTextFromSchemaDialog({ triggeredFrom: '', show: false });
          switch (showTextFromSchemaDialog.triggeredFrom) {
            case 'enhancementtab':
              toggleEnhancementDialog();
              break;
            default:
              break;
          }
        }}
      ></SchemaFromTextDialog>
      <Content
        openChatBot={() => setShowChatBot(true)}
        isLeftExpanded={isLeftExpanded}
        isRightExpanded={isRightExpanded}
        showChatBot={showChatBot}
        openTextSchema={() => {
          setShowTextFromSchemaDialog({ triggeredFrom: 'schemadialog', show: true });
        }}
        isSchema={isSchema}
        setIsSchema={setIsSchema}
        showEnhancementDialog={showEnhancementDialog}
        toggleEnhancementDialog={toggleEnhancementDialog}
        setOpenConnection={setOpenConnection}
        showDisconnectButton={showDisconnectButton}
        connectionStatus={connectionStatus}
      />
      {showDrawerChatbot && (
        <DrawerChatbot
          messages={messages}
          isExpanded={isRightExpanded}
          clearHistoryData={clearHistoryData}
          connectionStatus={connectionStatus}
        />
      )}
      <SideNav
        messages={messages}
        isExpanded={isRightExpanded}
        position='right'
        toggleDrawer={toggleRightDrawer}
        deleteOnClick={deleteOnClick}
        showDrawerChatbot={showDrawerChatbot}
        setShowDrawerChatbot={setShowDrawerChatbot}
        setIsRightExpanded={setIsRightExpanded}
        clearHistoryData={clearHistoryData}
        toggleGCSModal={toggleGCSModal}
        toggles3Modal={toggleS3Modal}
        toggleGenericModal={toggleGenericModal}
        setIsleftExpanded={setIsLeftExpanded}
      />
    </div>
  );
};

export default PageLayout;
