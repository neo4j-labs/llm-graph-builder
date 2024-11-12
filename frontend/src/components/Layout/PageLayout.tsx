import { useReducer, useState } from 'react';
import SideNav from './SideNav';
import DrawerDropzone from './DrawerDropzone';
import DrawerChatbot from './DrawerChatbot';
import Content from '../Content';
import { clearChatAPI } from '../../services/QnaAPI';
import { useCredentials } from '../../context/UserCredentials';
import { UserCredentials } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
import { useMediaQuery } from '@mui/material';
import { useFileContext } from '../../context/UsersFiles';
import SchemaFromTextDialog from '../Popups/Settings/SchemaFromText';
import useSpeechSynthesis from '../../hooks/useSpeech';

export default function PageLayout() {
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
  const { cancel } = useSpeechSynthesis();
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
}
