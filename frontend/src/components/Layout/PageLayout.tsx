import { useState } from 'react';
import SideNav from './SideNav';
import DrawerDropzone from './DrawerDropzone';
import DrawerChatbot from './DrawerChatbot';
import Content from '../Content';
import SettingsModal from '../Popups/Settings/SettingModal';
import { clearChatAPI } from '../../services/QnaAPI';
import { useCredentials } from '../../context/UserCredentials';
import { UserCredentials, alertStateType } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
import { AlertColor, AlertPropsColorOverrides } from '@mui/material';
import { OverridableStringUnion } from '@mui/types';
import { useFileContext } from '../../context/UsersFiles';
import SchemaFromTextDialog from '../Popups/Settings/SchemaFromText';
import CustomAlert from '../UI/Alert';

export default function PageLayoutNew({
  isSettingPanelExpanded,
  closeSettingModal,
  openSettingsDialog,
}: {
  isSettingPanelExpanded: boolean;
  closeSettingModal: () => void;
  openSettingsDialog: () => void;
}) {
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(true);
  const [isRightExpanded, setIsRightExpanded] = useState<boolean>(true);
  const [showChatBot, setShowChatBot] = useState<boolean>(false);
  const [showDrawerChatbot, setShowDrawerChatbot] = useState<boolean>(true);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const [showEnhancementDialog, setshowEnhancementDialog] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const toggleLeftDrawer = () => setIsLeftExpanded(!isLeftExpanded);
  const toggleRightDrawer = () => setIsRightExpanded(!isRightExpanded);
  const [alertDetails, setalertDetails] = useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });
  const { messages } = useMessageContext();
  const { isSchema, setIsSchema, setShowTextFromSchemaDialog, showTextFromSchemaDialog } = useFileContext();

  const deleteOnClick = async () => {
    try {
      setClearHistoryData(true);
      const response = await clearChatAPI(
        userCredentials as UserCredentials,
        sessionStorage.getItem('session_id') ?? ''
      );
      if (response.data.status === 'Success') {
        setClearHistoryData(false);
      }
    } catch (error) {
      console.log(error);
      setClearHistoryData(false);
    }
  };

  const showAlert = (
    alertmsg: string,
    alerttype: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined
  ) => {
    setalertDetails({
      showAlert: true,
      alertMessage: alertmsg,
      alertType: alerttype,
    });
  };
  const handleClose = () => {
    setalertDetails({
      showAlert: false,
      alertType: 'info',
      alertMessage: '',
    });
  };

  return (
    <div style={{ maxHeight: 'calc(100vh - 58px)' }} className='flex overflow-hidden'>
      {alertDetails.showAlert && (
        <CustomAlert
          severity={alertDetails.alertType}
          open={alertDetails.showAlert}
          handleClose={handleClose}
          alertMessage={alertDetails.alertMessage}
        />
      )}
      <SideNav isExpanded={isLeftExpanded} position='left' toggleDrawer={toggleLeftDrawer} />
      <DrawerDropzone isExpanded={isLeftExpanded} />
      <SchemaFromTextDialog
        open={showTextFromSchemaDialog.show}
        openSettingsDialog={openSettingsDialog}
        onClose={() => {
          setShowTextFromSchemaDialog({ triggeredFrom: '', show: false });
          switch (showTextFromSchemaDialog.triggeredFrom) {
            case 'enhancementtab':
              setshowEnhancementDialog(true);
              break;
            case 'schemadialog':
              openSettingsDialog();
              break;
            default:
              break;
          }
        }}
        showAlert={showAlert}
      ></SchemaFromTextDialog>
      <SettingsModal
        openTextSchema={() => {
          setShowTextFromSchemaDialog({ triggeredFrom: 'schemadialog', show: true });
        }}
        open={isSettingPanelExpanded}
        onClose={closeSettingModal}
        settingView='headerView'
        isSchema={isSchema}
        setIsSchema={setIsSchema}
      />
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
        setshowEnhancementDialog={setshowEnhancementDialog}
        closeSettingModal={closeSettingModal}

      />
      {showDrawerChatbot && (
        <DrawerChatbot messages={messages} isExpanded={isRightExpanded} clearHistoryData={clearHistoryData} />
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
      />
    </div>
  );
}