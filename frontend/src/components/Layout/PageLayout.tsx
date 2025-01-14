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
import { useNavigate } from 'react-router';

const ConnectionModal = lazy(() => import('../Popups/ConnectionModal/ConnectionModal'));

const PageLayout: React.FC = () => {
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });
  const largedesktops = useMediaQuery(`(min-width:1440px )`);
  const { userCredentials, connectionStatus, setIsReadOnlyUser } = useCredentials();
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(Boolean(largedesktops));
  const [isRightExpanded, setIsRightExpanded] = useState<boolean>(Boolean(largedesktops));
  const [showChatBot, setShowChatBot] = useState<boolean>(false);
  const [showDrawerChatbot, setShowDrawerChatbot] = useState<boolean>(true);
  const [showEnhancementDialog, toggleEnhancementDialog] = useReducer((s) => !s, false);
  const [shows3Modal, toggleS3Modal] = useReducer((s) => !s, false);
  const [showGCSModal, toggleGCSModal] = useReducer((s) => !s, false);
  const [showGenericModal, toggleGenericModal] = useReducer((s) => !s, false);
  const navigate = useNavigate();
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

  const { messages, setClearHistoryData, clearHistoryData, setMessages, setIsDeleteChatLoading } = useMessageContext();
  const { setShowTextFromSchemaDialog, showTextFromSchemaDialog } = useFileContext();
  const {
    setConnectionStatus,
    setGdsActive,
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
      // Fetch backend health status
      try {
        const response = await healthStatus();
        setIsBackendConnected(response.data.healthy);
      } catch (error) {
        setIsBackendConnected(false);
      }
      // To set the disconnect button state
      const handleDisconnectButtonState = (isModalOpen: boolean) => {
        setShowDisconnectButton(isModalOpen);
        localStorage.setItem('disconnectButtonState', isModalOpen ? 'true' : 'false');
      };
      const setUserCredentialsLocally = (credentials: any) => {
        setUserCredentials(credentials);
        setIsGCSActive(credentials.isGCSActive ?? false);
        setGdsActive(credentials.isgdsActive);
        setIsReadOnlyUser(credentials.isReadonlyUser);
        localStorage.setItem(
          'neo4j.connection',
          JSON.stringify({
            uri: credentials.uri,
            user: credentials.userName,
            password: btoa(credentials.password),
            database: credentials.database,
            userDbVectorIndex: 384,
            isReadOnlyUser: credentials.isReadonlyUser,
            isgdsActive: credentials.isgdsActive,
            isGCSActive: credentials.isGCSActive,
          })
        );
      };
      const parseSessionAndSetCredentials = (neo4jConnection: string) => {
        if (!neo4jConnection) {
          console.error('Invalid session data:', neo4jConnection);
          setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
          return;
        }
        try {
          const parsedConnection = JSON.parse(neo4jConnection);
          if (parsedConnection.uri && parsedConnection.user && parsedConnection.password && parsedConnection.database) {
            setUserCredentials({
              uri: parsedConnection.uri,
              userName: parsedConnection.user,
              password: atob(parsedConnection.password),
              database: parsedConnection.database,
            });
            setGdsActive(parsedConnection.isgdsActive);
            setIsReadOnlyUser(parsedConnection.isReadOnlyUser);
          } else {
            console.error('Invalid parsed session data:', parsedConnection);
          }
        } catch (error) {
          console.error('Failed to parse session data:', error);
        }
      };
      // To update credentials if environment values differ
      const updateSessionIfNeeded = (envCredentials: UserCredentials, storedSession: string) => {
        try {
          const storedCredentials = JSON.parse(storedSession);
          const isDiffCreds =
            envCredentials.uri !== storedCredentials.uri ||
            envCredentials.userName !== storedCredentials.user ||
            btoa(envCredentials.password) !== storedCredentials.password ||
            envCredentials.database !== storedCredentials.database;
          if (isDiffCreds) {
            setUserCredentialsLocally(envCredentials);
            setClearHistoryData(true);
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to update session:', error);
          return false;
        }
      };
      // Handle connection initialization
      let backendApiResponse;
      try {
        backendApiResponse = await envConnectionAPI();
        const connectionData = backendApiResponse.data;
        if (connectionData.data && connectionData.status === 'Success') {
          const envCredentials = {
            uri: connectionData.data.uri,
            password: atob(connectionData.data.password),
            userName: connectionData.data.user_name,
            database: connectionData.data.database,
            isReadonlyUser: !connectionData.data.write_access,
            isgdsActive: connectionData.data.gds_status,
            isGCSActive: connectionData?.data?.gcs_file_cache === 'True',
          };
          setIsGCSActive(envCredentials.isGCSActive);
          if (session) {
            const updated = updateSessionIfNeeded(envCredentials, session);
            if (!updated) {
              parseSessionAndSetCredentials(session);
            }
            setConnectionStatus(Boolean(connectionData.data.graph_connection));
            setIsBackendConnected(true);
          } else {
            setUserCredentialsLocally(envCredentials);
            setConnectionStatus(true);
          }
          handleDisconnectButtonState(false);
        } else {
          if (session) {
            parseSessionAndSetCredentials(session);
            setConnectionStatus(true);
          } else {
            setErrorMessage(backendApiResponse?.data?.error);
            setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
          }
          handleDisconnectButtonState(true);
        }
      } catch (error) {
        console.error('Error during backend API call:', error);
        if (session) {
          parseSessionAndSetCredentials(session);
          setConnectionStatus(true);
        } else {
          setErrorMessage(backendApiResponse?.data?.error);
          setOpenConnection((prev) => ({ ...prev, openPopUp: true }));
        }
        handleDisconnectButtonState(true);
      }
    }
    initializeConnection();
  }, []);

  const deleteOnClick = async () => {
    try {
      setClearHistoryData(true);
      setIsDeleteChatLoading(true);
      cancel();
      const response = await clearChatAPI(
        userCredentials as UserCredentials,
        sessionStorage.getItem('session_id') ?? ''
      );
      setIsDeleteChatLoading(false);
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
        navigate('.', { replace: true, state: null });
      }
    } catch (error) {
      setIsDeleteChatLoading(false);
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
      {largedesktops ? (
        <div
          className={`layout-wrapper ${!isLeftExpanded ? 'drawerdropzoneclosed' : ''} ${
            !isRightExpanded ? 'drawerchatbotclosed' : ''
          } ${!isRightExpanded && !isLeftExpanded ? 'drawerclosed' : ''}`}
        >
          <SideNav
            toggles3Modal={toggleS3Modal}
            toggleGCSModal={toggleGCSModal}
            toggleGenericModal={toggleGenericModal}
            isExpanded={isLeftExpanded}
            position='left'
            toggleDrawer={toggleLeftDrawer}
          />
          {isLeftExpanded && (
            <DrawerDropzone
              shows3Modal={shows3Modal}
              showGCSModal={showGCSModal}
              showGenericModal={showGenericModal}
              toggleGCSModal={toggleGCSModal}
              toggleGenericModal={toggleGenericModal}
              toggleS3Modal={toggleS3Modal}
              isExpanded={isLeftExpanded}
            />
          )}
          <Content
            openChatBot={() => setShowChatBot(true)}
            showChatBot={showChatBot}
            openTextSchema={() => {
              setShowTextFromSchemaDialog({ triggeredFrom: 'schemadialog', show: true });
            }}
            showEnhancementDialog={showEnhancementDialog}
            toggleEnhancementDialog={toggleEnhancementDialog}
            setOpenConnection={setOpenConnection}
            showDisconnectButton={showDisconnectButton}
            connectionStatus={connectionStatus}
          />
          {isRightExpanded && (
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
      ) : (
        <>
          <DrawerDropzone
            shows3Modal={shows3Modal}
            showGCSModal={showGCSModal}
            showGenericModal={showGenericModal}
            toggleGCSModal={toggleGCSModal}
            toggleGenericModal={toggleGenericModal}
            toggleS3Modal={toggleS3Modal}
            isExpanded={isLeftExpanded}
          />

          <div className='layout-wrapper drawerclosed'>
            <SideNav
              toggles3Modal={toggleS3Modal}
              toggleGCSModal={toggleGCSModal}
              toggleGenericModal={toggleGenericModal}
              isExpanded={isLeftExpanded}
              position='left'
              toggleDrawer={toggleLeftDrawer}
            />

            <Content
              openChatBot={() => setShowChatBot(true)}
              showChatBot={showChatBot}
              openTextSchema={() => {
                setShowTextFromSchemaDialog({ triggeredFrom: 'schemadialog', show: true });
              }}
              showEnhancementDialog={showEnhancementDialog}
              toggleEnhancementDialog={toggleEnhancementDialog}
              setOpenConnection={setOpenConnection}
              showDisconnectButton={showDisconnectButton}
              connectionStatus={connectionStatus}
            />
            {isRightExpanded && (
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
        </>
      )}
    </>
  );
};

export default PageLayout;
