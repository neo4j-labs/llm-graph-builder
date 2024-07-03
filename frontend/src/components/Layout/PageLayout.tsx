import { useCallback, useState } from 'react';
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
import DeletePopUpForOrphanNodes from '../Popups/DeletePopUpForOrphanNodes';
import deleteOrphanAPI from '../../services/DeleteOrphanNodes';

export default function PageLayoutNew({
  isSettingPanelExpanded,
  closeSettingModal,
  openSettingsDialog,
  closeOrphanNodeDeletionModal,
  showOrphanNodeDeletionModal,
  openOrphanNodeDeletionModal,
}: {
  isSettingPanelExpanded: boolean;
  closeSettingModal: () => void;
  openSettingsDialog: () => void;
  closeOrphanNodeDeletionModal: () => void;
  showOrphanNodeDeletionModal: boolean;
  openOrphanNodeDeletionModal: () => void;
}) {
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(true);
  const [isRightExpanded, setIsRightExpanded] = useState<boolean>(false);
  const [showChatBot, setShowChatBot] = useState<boolean>(false);
  const [showDrawerChatbot, setShowDrawerChatbot] = useState<boolean>(true);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const toggleLeftDrawer = () => setIsLeftExpanded(!isLeftExpanded);
  const toggleRightDrawer = () => setIsRightExpanded(!isRightExpanded);
  const [openTextSchemaDialog, setOpenTextSchemaDialog] = useState<boolean>(false);
  const [orphanDeleteAPIloading, setorphanDeleteAPIloading] = useState<boolean>(false);
  const [alertDetails, setalertDetails] = useState<alertStateType>({
    showAlert: false,
    alertType: 'error',
    alertMessage: '',
  });
  const { messages } = useMessageContext();
  const openSchemaFromTextDialog = useCallback(() => setOpenTextSchemaDialog(true), []);
  const closeSchemaFromTextDialog = useCallback(() => setOpenTextSchemaDialog(false), []);
  const { isSchema, setIsSchema } = useFileContext();

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
  const orphanNodesDeleteHandler = async (selectedEntities: string[]) => {
    try {
      setorphanDeleteAPIloading(true);
      const response = await deleteOrphanAPI(userCredentials as UserCredentials, selectedEntities);
      setorphanDeleteAPIloading(false);
      console.log(response);
    } catch (error) {
      console.log(error);
    }
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
        open={openTextSchemaDialog}
        openSettingsDialog={openSettingsDialog}
        onClose={closeSchemaFromTextDialog}
        showAlert={showAlert}
      ></SchemaFromTextDialog>
      <DeletePopUpForOrphanNodes
        open={showOrphanNodeDeletionModal}
        deleteCloseHandler={closeOrphanNodeDeletionModal}
        deleteHandler={orphanNodesDeleteHandler}
        loading={orphanDeleteAPIloading}
      ></DeletePopUpForOrphanNodes>
      <SettingsModal
        openTextSchema={openSchemaFromTextDialog}
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
        openTextSchema={openSchemaFromTextDialog}
        openOrphanNodeDeletionModal={openOrphanNodeDeletionModal}
        isSchema={isSchema}
        setIsSchema={setIsSchema}
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
