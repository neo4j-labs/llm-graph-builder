import { useState } from 'react';
import SideNav from './SideNav';
import DrawerDropzone from './DrawerDropzone';
import DrawerChatbot from './DrawerChatbot';
import Content from '../Content';
import SettingsModal from '../SettingModal';
import { clearChatAPI } from '../../services/QnaAPI';
import { useCredentials } from '../../context/UserCredentials';
import { UserCredentials } from '../../types';
import { useMessageContext } from '../../context/UserMessages';
export default function PageLayoutNew({
  isSettingPanelExpanded,
  closeSettingModal,
}: {
  isSettingPanelExpanded: boolean;
  closeSettingModal: () => void;
}) {
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(true);
  const [isRightExpanded, setIsRightExpanded] = useState<boolean>(true);
  const [showChatBot, setShowChatBot] = useState<boolean>(false);
  const [showDrawerChatbot, setShowDrawerChatbot] = useState<boolean>(true);
  const [clearHistoryData, setClearHistoryData] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const toggleLeftDrawer = () => setIsLeftExpanded(!isLeftExpanded);
  const toggleRightDrawer = () => setIsRightExpanded(!isRightExpanded);
  const { messages } = useMessageContext();

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
  return (
    <div style={{ maxHeight: 'calc(100vh - 58px)' }} className='flex overflow-hidden'>
      <SideNav isExpanded={isLeftExpanded} position='left' toggleDrawer={toggleLeftDrawer} />
      <DrawerDropzone isExpanded={isLeftExpanded} />
      <SettingsModal open={isSettingPanelExpanded} onClose={closeSettingModal} />
      <Content
        openChatBot={() => setShowChatBot(true)}
        isLeftExpanded={isLeftExpanded}
        isRightExpanded={isRightExpanded}
        showChatBot={showChatBot}
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
