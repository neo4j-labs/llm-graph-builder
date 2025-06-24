import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import SideNav from './SideNav';
import DrawerDropzone from './DrawerDropzone';
import DrawerChatbot from './DrawerChatbot';
import Content from '../Content';
import { clearChatAPI } from '../../services/QnaAPI';
import { useCredentials } from '../../context/UserCredentials';
import { connectionState, OptionType } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
import { useMediaQuery, Spotlight, SpotlightTour, useSpotlightContext } from '@neo4j-ndl/react';
import { useFileContext } from '../../context/UsersFiles';
import SchemaFromTextDialog from '../../components/Popups/GraphEnhancementDialog/EnitityExtraction/SchemaFromTextDialog';
import useSpeechSynthesis from '../../hooks/useSpeech';
import FallBackDialog from '../UI/FallBackDialog';
import { envConnectionAPI } from '../../services/ConnectAPI';
import { healthStatus } from '../../services/HealthStatus';
import { useAuth0 } from '@auth0/auth0-react';
import { showErrorToast } from '../../utils/Toasts';
import { APP_SOURCES } from '../../utils/Constants';
import { createDefaultFormData } from '../../API/Index';
import LoadDBSchemaDialog from '../Popups/GraphEnhancementDialog/EnitityExtraction/LoadExistingSchema';
import PredefinedSchemaDialog from '../Popups/GraphEnhancementDialog/EnitityExtraction/PredefinedSchemaDialog';
import { SKIP_AUTH } from '../../utils/Constants';
import { useNavigate } from 'react-router';
import { deduplicateByFullPattern, deduplicateNodeByValue } from '../../utils/Utils';
import DataImporterSchemaDialog from '../Popups/GraphEnhancementDialog/EnitityExtraction/DataImporter';


const GCSModal = lazy(() => import('../DataSources/GCS/GCSModal'));
const S3Modal = lazy(() => import('../DataSources/AWS/S3Modal'));
const GenericModal = lazy(() => import('../WebSources/GenericSourceModal'));
const ConnectionModal = lazy(() => import('../Popups/ConnectionModal/ConnectionModal'));
const spotlightsforunauthenticated = [
  {
    target: 'loginbutton',
    children: (
      <>
        <Spotlight.Header>Login with Neo4j</Spotlight.Header>
        <Spotlight.Body>Using Google Account or Email Address</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'connectbutton',
    children: (
      <>
        <Spotlight.Header>Connect To Neo4j Database</Spotlight.Header>
        <Spotlight.Body>Fill out the neo4j credentials and click on connect</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'dropzone',
    children: (
      <>
        <Spotlight.Header>Upload documents </Spotlight.Header>
        <Spotlight.Body>Upload any unstructured files</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'llmdropdown',
    children: (
      <>
        <Spotlight.Header>Choose The Desired LLM</Spotlight.Header>
      </>
    ),
  },
  {
    target: 'generategraphbtn',
    children: (
      <>
        <Spotlight.Header>Start The Extraction Process</Spotlight.Header>
        <Spotlight.Body>Click On Generate Graph</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'visualizegraphbtn',
    children: (
      <>
        <Spotlight.Header>Visualize The Knowledge Graph</Spotlight.Header>
        <Spotlight.Body>Select At Least One or More Completed Files From The Table For Visualization</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'chatbtn',
    children: (
      <>
        <Spotlight.Header>Ask Questions Related To Documents</Spotlight.Header>
      </>
    ),
  },
];
const spotlights = [
  {
    target: 'connectbutton',
    children: (
      <>
        <Spotlight.Header>Connect To Neo4j Database</Spotlight.Header>
        <Spotlight.Body>Fill out the neo4j credentials and click on connect</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'dropzone',
    children: (
      <>
        <Spotlight.Header>Upload documents </Spotlight.Header>
        <Spotlight.Body>Upload any unstructured files</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'llmdropdown',
    children: (
      <>
        <Spotlight.Header>Choose The Desired LLM</Spotlight.Header>
      </>
    ),
  },
  {
    target: 'generategraphbtn',
    children: (
      <>
        <Spotlight.Header>Start The Extraction Process</Spotlight.Header>
        <Spotlight.Body>Click On Generate Graph</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'visualizegraphbtn',
    children: (
      <>
        <Spotlight.Header>Visualize The Knowledge Graph</Spotlight.Header>
        <Spotlight.Body>Select At Least One or More Completed Files From The Table For Visualization</Spotlight.Body>
      </>
    ),
  },
  {
    target: 'chatbtn',
    children: (
      <>
        <Spotlight.Header>Ask Questions Related To Documents</Spotlight.Header>
      </>
    ),
  },
];
const PageLayout: React.FC = () => {
  const [openConnection, setOpenConnection] = useState<connectionState>({
    openPopUp: false,
    chunksExists: false,
    vectorIndexMisMatch: false,
    chunksExistsWithDifferentDimension: false,
  });
  const isLargeDesktop = useMediaQuery(`(min-width:1440px )`);
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(false);
  const [isRightExpanded, setIsRightExpanded] = useState<boolean>(false);
  const [showChatBot, setShowChatBot] = useState<boolean>(false);
  const [showDrawerChatbot, setShowDrawerChatbot] = useState<boolean>(true);
  const [showEnhancementDialog, toggleEnhancementDialog] = useReducer((s) => !s, false);
  const [shows3Modal, toggleS3Modal] = useReducer((s) => !s, false);
  const [showGCSModal, toggleGCSModal] = useReducer((s) => !s, false);
  const [showGenericModal, toggleGenericModal] = useReducer((s) => !s, false);
  const {
    connectionStatus,
    setIsReadOnlyUser,
    setConnectionStatus,
    setGdsActive,
    setIsBackendConnected,
    setUserCredentials,
    setErrorMessage,
    setShowDisconnectButton,
    showDisconnectButton,
    setIsGCSActive,
  } = useCredentials();
  const {
    setShowTextFromSchemaDialog,
    showTextFromSchemaDialog,
    setSchemaTextPattern,
    schemaLoadDialog,
    setSchemaLoadDialog,
    setPredefinedSchemaDialog,
    setDbPattern,
    setSchemaValNodes,
    predefinedSchemaDialog,
    setSchemaValRels,
    setDbNodes,
    setDbRels,
    setPreDefinedNodes,
    setPreDefinedRels,
    setPreDefinedPattern,
    allPatterns,
    selectedNodes,
    selectedRels,
    dataImporterSchemaDialog,
    setDataImporterSchemaDialog,
    setImporterPattern,
    setImporterNodes,
    setImporterRels,
    setSourceOptions,
    setTargetOptions,
    setTypeOptions,
  } = useFileContext();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth0();
  const { cancel } = useSpeechSynthesis();
  const { setActiveSpotlight } = useSpotlightContext();
  const isYoutubeOnly = useMemo(
    () => APP_SOURCES.includes('youtube') && !APP_SOURCES.includes('wiki') && !APP_SOURCES.includes('web'),
    []
  );
  const isWikipediaOnly = useMemo(
    () => APP_SOURCES.includes('wiki') && !APP_SOURCES.includes('youtube') && !APP_SOURCES.includes('web'),
    []
  );
  const isWebOnly = useMemo(
    () => APP_SOURCES.includes('web') && !APP_SOURCES.includes('youtube') && !APP_SOURCES.includes('wiki'),
    []
  );
  const { messages, setClearHistoryData, clearHistoryData, setMessages, setIsDeleteChatLoading } = useMessageContext();
  const isFirstTimeUser = useMemo(() => localStorage.getItem('neo4j.connection') === null, []);

  const [combinedPatternsVal, setCombinedPatternsVal] = useState<string[]>([]);
  const [combinedNodesVal, setCombinedNodesVal] = useState<OptionType[]>([]);
  const [combinedRelsVal, setCombinedRelsVal] = useState<OptionType[]>([]);

  useEffect(() => {
    if (allPatterns.length > 0 && selectedNodes.length > 0 && selectedRels.length > 0) {
      setCombinedPatternsVal(allPatterns);
      setCombinedNodesVal(selectedNodes as OptionType[]);
      setCombinedRelsVal(selectedRels as OptionType[]);
    }
  }, [allPatterns, selectedNodes, selectedRels]);

  useEffect(() => {
    async function initializeConnection() {
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
      try {
        const backendApiResponse = await envConnectionAPI();
        const connectionData = backendApiResponse.data;
        if (connectionData.data && connectionData.status === 'Success') {
          const credentials = {
            uri: connectionData.data.uri,
            isReadonlyUser: !connectionData.data.write_access,
            isgdsActive: connectionData.data.gds_status,
            isGCSActive: connectionData.data.gcs_file_cache === 'True',
            chunksTobeProcess: Number(connectionData.data.chunk_to_be_created),
            email: user?.email ?? '',
            connection: 'backendApi',
          };
          setIsGCSActive(credentials.isGCSActive);
          setUserCredentials(credentials);
          createDefaultFormData({ uri: credentials.uri, email: credentials.email ?? '' });
          setGdsActive(credentials.isgdsActive);
          setConnectionStatus(Boolean(connectionData.data.graph_connection));
          setIsReadOnlyUser(connectionData.data.isReadonlyUser);
          handleDisconnectButtonState(false);
        } else if (!connectionData.data && connectionData.status === 'Success') {
          const storedCredentials = localStorage.getItem('neo4j.connection');
          if (storedCredentials) {
            const credentials = JSON.parse(storedCredentials);
            setUserCredentials({ ...credentials, password: atob(credentials.password) });
            createDefaultFormData({
              uri: credentials.uri,
              database: credentials.database,
              userName: credentials.userName,
              password: atob(credentials?.password),
              email: credentials.email ?? '',
            });
            setIsGCSActive(credentials.isGCSActive);
            setGdsActive(credentials.isgdsActive);
            setConnectionStatus(Boolean(credentials.connection === 'connectAPI'));
            if (credentials.isReadonlyUser !== undefined) {
              setIsReadOnlyUser(credentials.isReadonlyUser);
            }
            handleDisconnectButtonState(true);
          } else {
            handleDisconnectButtonState(true);
          }
        } else {
          setErrorMessage(backendApiResponse?.data?.error);
          handleDisconnectButtonState(true);
          console.log('from else cndition error is there');
        }
      } catch (error) {
        if (error instanceof Error) {
          showErrorToast(error.message);
        }
      }
    }
    initializeConnection();
    if (!isAuthenticated && isFirstTimeUser) {
      setActiveSpotlight('loginbutton');
    }

    if ((isAuthenticated || SKIP_AUTH) && isFirstTimeUser) {
      setActiveSpotlight('connectbutton');
    }
  }, [isAuthenticated, isFirstTimeUser]);

  const toggleLeftDrawer = useCallback(() => {
    if (isLargeDesktop) {
      setIsLeftExpanded((old) => !old);
    } else {
      setIsLeftExpanded(false);
    }
  }, [isLargeDesktop]);
  const toggleRightDrawer = useCallback(() => {
    if (isLargeDesktop) {
      setIsRightExpanded((prev) => !prev);
    } else {
      setIsRightExpanded(false);
    }
  }, [isLargeDesktop]);

  const deleteOnClick = useCallback(async () => {
    try {
      setClearHistoryData(true);
      setIsDeleteChatLoading(true);
      cancel();
      const response = await clearChatAPI(sessionStorage.getItem('session_id') ?? '');
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
  }, []);

  const handleApplyPatternsFromText = useCallback(
    (
      newPatterns: string[],
      nodes: OptionType[],
      rels: OptionType[],
      updatedSource: OptionType[],
      updatedTarget: OptionType[],
      updatedType: OptionType[]
    ) => {
      setSchemaTextPattern((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setCombinedPatternsVal((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setShowTextFromSchemaDialog({
        triggeredFrom: 'schematextApply',
        show: true,
      });
      setSchemaValNodes(nodes);
      setCombinedNodesVal((prevNodes: OptionType[]) => {
        const combined = [...nodes, ...prevNodes];
        return deduplicateNodeByValue(combined);
      });
      setSchemaValRels(rels);
      setCombinedRelsVal((prevRels: OptionType[]) => {
        const combined = [...rels, ...prevRels];
        return deduplicateByFullPattern(combined);
      });
      setSourceOptions((prev) => [...prev, ...updatedSource]);
      setTargetOptions((prev) => [...prev, ...updatedTarget]);
      setTypeOptions((prev) => [...prev, ...updatedType]);
    },
    []
  );

  const handleDbApply = useCallback(
    (
      newPatterns: string[],
      nodes: OptionType[],
      rels: OptionType[],
      updatedSource: OptionType[],
      updatedTarget: OptionType[],
      updatedType: OptionType[]
    ) => {
      setDbPattern((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setCombinedPatternsVal((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setSchemaLoadDialog({
        triggeredFrom: 'loadExistingSchemaApply',
        show: true,
      });
      setDbNodes(nodes);
      setCombinedNodesVal((prevNodes: OptionType[]) => {
        const combined = [...nodes, ...prevNodes];
        return deduplicateNodeByValue(combined);
      });
      setDbRels(rels);
      setCombinedRelsVal((prevRels: OptionType[]) => {
        const combined = [...rels, ...prevRels];
        return deduplicateByFullPattern(combined);
      });
      setSourceOptions((prev) => [...prev, ...updatedSource]);
      setTargetOptions((prev) => [...prev, ...updatedTarget]);
      setTypeOptions((prev) => [...prev, ...updatedType]);
    },
    []
  );
  const handlePredinedApply = useCallback(
    (
      newPatterns: string[],
      nodes: OptionType[],
      rels: OptionType[],
      updatedSource: OptionType[],
      updatedTarget: OptionType[],
      updatedType: OptionType[]
    ) => {
      setPreDefinedPattern((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setCombinedPatternsVal((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setPredefinedSchemaDialog({
        triggeredFrom: 'predefinedSchemaApply',
        show: true,
      });
      setPreDefinedNodes(nodes);
      setCombinedNodesVal((prevNodes: OptionType[]) => {
        const combined = [...nodes, ...prevNodes];
        return deduplicateNodeByValue(combined);
      });
      setPreDefinedRels(rels);
      setCombinedRelsVal((prevRels: OptionType[]) => {
        const combined = [...rels, ...prevRels];
        return deduplicateByFullPattern(combined);
      });
      setSourceOptions((prev) => [...prev, ...updatedSource]);
      setTargetOptions((prev) => [...prev, ...updatedTarget]);
      setTypeOptions((prev) => [...prev, ...updatedType]);
    },
    []
  );

  const handleImporterApply = useCallback(
    (
      newPatterns: string[],
      nodes: OptionType[],
      rels: OptionType[],
      updatedSource: OptionType[],
      updatedTarget: OptionType[],
      updatedType: OptionType[]
    ) => {
      setImporterPattern((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setCombinedPatternsVal((prevPatterns: string[]) => {
        const uniquePatterns = Array.from(new Set([...newPatterns, ...prevPatterns]));
        return uniquePatterns;
      });
      setDataImporterSchemaDialog({
        triggeredFrom: 'importerSchemaApply',
        show: true,
      });
      setImporterNodes(nodes);
      setCombinedNodesVal((prevNodes: OptionType[]) => {
        const combined = [...nodes, ...prevNodes];
        return deduplicateNodeByValue(combined);
      });
      setImporterRels(rels);
      setCombinedRelsVal((prevRels: OptionType[]) => {
        const combined = [...rels, ...prevRels];
        return deduplicateByFullPattern(combined);
      });
      setSourceOptions((prev) => [...prev, ...updatedSource]);
      setTargetOptions((prev) => [...prev, ...updatedTarget]);
      setTypeOptions((prev) => [...prev, ...updatedType]);
    },
    []
  );

  const openPredefinedSchema = useCallback(() => {
    setPredefinedSchemaDialog({ triggeredFrom: 'predefinedDialog', show: true });
  }, []);

  const openLoadSchema = useCallback(() => {
    setSchemaLoadDialog({ triggeredFrom: 'loadDialog', show: true });
  }, []);

  const openTextSchema = useCallback(() => {
    setShowTextFromSchemaDialog({ triggeredFrom: 'schemadialog', show: true });
  }, []);

  const openDataImporterSchema = useCallback(() => {
    setDataImporterSchemaDialog({ triggeredFrom: 'schemadialog', show: true });
  }, []);

  const openChatBot = useCallback(() => setShowChatBot(true), []);

  return (
    <>
      {!isAuthenticated && !SKIP_AUTH && isFirstTimeUser ? (
        <SpotlightTour
          spotlights={spotlightsforunauthenticated}
          onAction={(target, action) => {
            if (target == 'connectbutton' && action == 'next') {
              if (!isLeftExpanded) {
                toggleLeftDrawer();
              }
            }
            if (target === 'visualizegraphbtn' && action === 'next' && !isRightExpanded) {
              toggleRightDrawer();
            }
            console.log(`Action ${action} was performed in spotlight ${target}`);
          }}
        />
      ) : (isAuthenticated || SKIP_AUTH) && isFirstTimeUser ? (
        <SpotlightTour
          spotlights={spotlights}
          onAction={(target, action) => {
            if (target == 'connectbutton' && action == 'next') {
              if (!isLeftExpanded) {
                toggleLeftDrawer();
              }
            }
            if (target === 'visualizegraphbtn' && action === 'next' && !isRightExpanded) {
              toggleRightDrawer();
            }
            console.log(`Action ${action} was performed in spotlight ${target}`);
          }}
        />
      ) : null}

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
        onApply={handleApplyPatternsFromText}
      ></SchemaFromTextDialog>
      <LoadDBSchemaDialog
        open={schemaLoadDialog.show}
        onClose={() => {
          setSchemaLoadDialog({ triggeredFrom: '', show: false });
          switch (schemaLoadDialog.triggeredFrom) {
            case 'enhancementtab':
              toggleEnhancementDialog();
              break;
            default:
              break;
          }
        }}
        onApply={handleDbApply}
      />
      <PredefinedSchemaDialog
        open={predefinedSchemaDialog.show}
        onClose={() => {
          setPredefinedSchemaDialog({ triggeredFrom: '', show: false });
          switch (predefinedSchemaDialog.triggeredFrom) {
            case 'enhancementtab':
              toggleEnhancementDialog();
              break;
            default:
              break;
          }
        }}
        onApply={handlePredinedApply}
      ></PredefinedSchemaDialog>
      <DataImporterSchemaDialog
        open={dataImporterSchemaDialog.show}
        onClose={() => {
          setDataImporterSchemaDialog({ triggeredFrom: '', show: false });
          switch (dataImporterSchemaDialog.triggeredFrom) {
            case 'enhancementtab':
              toggleEnhancementDialog();
              break;
            default:
              break;
          }
        }}
        onApply={handleImporterApply}
      ></DataImporterSchemaDialog>
      {isLargeDesktop ? (
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
            openChatBot={openChatBot}
            showChatBot={showChatBot}
            openTextSchema={openTextSchema}
            openLoadSchema={openLoadSchema}
            openPredefinedSchema={openPredefinedSchema}
            openDataImporterSchema={openDataImporterSchema}
            showEnhancementDialog={showEnhancementDialog}
            toggleEnhancementDialog={toggleEnhancementDialog}
            setOpenConnection={setOpenConnection}
            showDisconnectButton={showDisconnectButton}
            connectionStatus={connectionStatus}
            combinedPatterns={combinedPatternsVal}
            setCombinedPatterns={setCombinedPatternsVal}
            combinedNodes={combinedNodesVal}
            setCombinedNodes={setCombinedNodesVal}
            combinedRels={combinedRelsVal}
            setCombinedRels={setCombinedRelsVal}
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
          {APP_SOURCES.includes('gcs') && (
            <Suspense fallback={<FallBackDialog />}>
              <GCSModal openGCSModal={toggleGCSModal} open={showGCSModal} hideModal={toggleGCSModal} />
            </Suspense>
          )}
          {APP_SOURCES.includes('s3') && (
            <Suspense fallback={<FallBackDialog />}>
              <S3Modal hideModal={toggleS3Modal} open={shows3Modal} />
            </Suspense>
          )}

          <Suspense fallback={<FallBackDialog />}>
            <GenericModal
              isOnlyYoutube={isYoutubeOnly}
              isOnlyWikipedia={isWikipediaOnly}
              isOnlyWeb={isWebOnly}
              open={showGenericModal}
              closeHandler={toggleGenericModal}
            />
          </Suspense>
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
              openChatBot={openChatBot}
              showChatBot={showChatBot}
              openTextSchema={openTextSchema}
              openLoadSchema={openLoadSchema}
              openPredefinedSchema={openPredefinedSchema}
              openDataImporterSchema={openDataImporterSchema}
              showEnhancementDialog={showEnhancementDialog}
              toggleEnhancementDialog={toggleEnhancementDialog}
              setOpenConnection={setOpenConnection}
              showDisconnectButton={showDisconnectButton}
              connectionStatus={connectionStatus}
              combinedPatterns={combinedPatternsVal}
              setCombinedPatterns={setCombinedPatternsVal}
              combinedNodes={combinedNodesVal}
              setCombinedNodes={setCombinedNodesVal}
              combinedRels={combinedRelsVal}
              setCombinedRels={setCombinedRelsVal}
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
