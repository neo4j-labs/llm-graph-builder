import DrawerDropzone from './DrawerDropzone';
import Content from '../Content';
import SideNav from './SideNav';
import { useState } from 'react';
import RightSideBar from '../RightSideBar';
import SettingsModal from '../SettingModal';

export default function PageLayout({
  isSettingPanelExpanded,
  closeSettingModal,
}: {
  isSettingPanelExpanded: boolean;
  closeSettingModal: () => void;
}) {
  const [isExpanded, setIsexpanded] = useState<boolean>(true);
  const [showChatBot, setShowChatBot] = useState<boolean>(false);

  return (
    <div style={{ maxHeight: 'calc(100vh - 60px)', display: 'flex', overflow: 'hidden' }}>
      <SideNav
        isExpanded={isExpanded}
        openDrawer={() => {
          setIsexpanded(true);
        }}
        closeDrawer={() => {
          setIsexpanded(false);
        }}
      />
      <DrawerDropzone isExpanded={isExpanded} />
      <SettingsModal open={isSettingPanelExpanded} onClose={closeSettingModal} />
      <Content
        openChatBot={() => {
          setShowChatBot(true);
        }}
        isExpanded={isExpanded}
        showChatBot={showChatBot}
      />
      <RightSideBar
        closeChatBot={() => {
          setShowChatBot(false);
        }}
        showChatBot={showChatBot}
      ></RightSideBar>
    </div>
  );
}
