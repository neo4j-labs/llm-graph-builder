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
    async function getHealthStatus() {
      try {
        const hasFetchedHealthStatus = localStorage.getItem('hasFetchedHealthStatus');
        const savedDisconnectButtonState = localStorage.getItem('disconnectButtonState') === 'true';
        // Initialize disconnect button state
        if (!hasFetchedHealthStatus) {
          setShowDisconnectButton(false);
          localStorage.setItem('disconnectButtonState', 'false');
        } else {
          setShowDisconnectButton(savedDisconnectButtonState);
        }
        if (hasFetchedHealthStatus) {
          setIsBackendConnected(true);
          const session = localStorage.getItem('neo4j.connection');
          if (session) {
            const neo4jConnection = JSON.parse(session);
            setUserCredentials({
              uri: neo4jConnection.uri,
              userName: neo4jConnection.user,
              password: atob(neo4jConnection.password),
              database: neo4jConnection.database,
              port: neo4jConnection.uri.split(':')[2],
            });
            setConnectionStatus(true);
          } else {
            setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
            setShowDisconnectButton(true);
            localStorage.setItem('disconnectButtonState', 'true');
          }
        } else {
          const response = await healthStatus();
          setIsBackendConnected(response.data.healthy);
          localStorage.setItem('hasFetchedHealthStatus', response.data.healthy);
          if (response.data.healthy && process.env.VITE_ENV === 'DEV') {
            let connectionResponse;
            try {
              connectionResponse = await envConnectionAPI();
              const credentials = {
                uri: connectionResponse.data.data.uri,
                password: atob(connectionResponse.data.data.password),
                userName: connectionResponse.data.data.user_name,
                database: connectionResponse.data.data.database,
                isReadonlyUser: connectionResponse.data.data.write_access,
                isGds: connectionResponse.data.data.gds_status,
              };
              setUserCredentials(credentials);
              localStorage.setItem(
                'neo4j.connection',
                JSON.stringify({
                  uri: credentials?.uri,
                  user: credentials?.userName,
                  password: btoa(credentials?.password),
                  database: credentials?.database,
                  userDbVectorIndex: 384,
                  isReadOnlyUser: credentials?.isReadonlyUser,
                  isGDS: credentials?.isGds,
                })
              );
              setConnectionStatus(connectionResponse.data.data.graph_connection);
            } catch (error) {
              setErrorMessage(connectionResponse?.data.error);
              setConnectionStatus(false);
              setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
              setShowDisconnectButton(true);
              localStorage.setItem('disconnectButtonState', 'true');
            }
          } else {
            const session = localStorage.getItem('neo4j.connection');
            if (session) {
              const neo4jConnection = JSON.parse(session);
              setUserCredentials({
                uri: neo4jConnection.uri,
                userName: neo4jConnection.user,
                password: atob(neo4jConnection.password),
                database: neo4jConnection.database,
                port: neo4jConnection.uri.split(':')[2],
              });
              setGdsActive(neo4jConnection.isgdsActive);
              setIsReadOnlyUser(neo4jConnection.isReadOnlyUser);
            } else {
              setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
              setShowDisconnectButton(true);
              localStorage.setItem('disconnectButtonState', 'true');
            }
          }
        }
      } catch (error) {
        setIsBackendConnected(false);
      }
    }
    getHealthStatus();
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
