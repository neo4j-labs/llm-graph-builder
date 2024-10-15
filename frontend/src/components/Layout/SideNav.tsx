import React, { useEffect, useRef, useState } from 'react';
import { Dialog, SideNavigation, TextLink, Tip, useMediaQuery } from '@neo4j-ndl/react';
import {
  ArrowRightIconOutline,
  ArrowLeftIconOutline,
  TrashIconOutline,
  ArrowsPointingOutIconOutline,
  ChatBubbleOvalLeftEllipsisIconOutline,
  CloudArrowUpIconSolid,
  ArrowDownTrayIconOutline,
} from '@neo4j-ndl/react/icons';
import { SideNavProps } from '../../types';
import Chatbot from '../ChatBot/Chatbot';
import { createPortal } from 'react-dom';
import { useMessageContext } from '../../context/UserMessages';
import { downloadClickHandler, getIsLoading } from '../../utils/Utils';
import ExpandedChatButtonContainer from '../ChatBot/ExpandedChatButtonContainer';
import { APP_SOURCES, tooltips } from '../../utils/Constants';
import ChatModeToggle from '../ChatBot/ChatModeToggle';
import { RiChatSettingsLine } from 'react-icons/ri';
import { IconButtonWithToolTip } from '../UI/IconButtonToolTip';
import GCSButton from '../DataSources/GCS/GCSButton';
import S3Component from '../DataSources/AWS/S3Bucket';
import WebButton from '../DataSources/Web/WebButton';
import DropZoneForSmallLayouts from '../DataSources/Local/DropZoneForSmallLayouts';
import { useCredentials } from '../../context/UserCredentials';
import TipWrapper from '../UI/TipWrapper';

const SideNav: React.FC<SideNavProps> = ({
  position,
  toggleDrawer,
  isExpanded,
  deleteOnClick,
  setShowDrawerChatbot,
  setIsRightExpanded,
  messages,
  clearHistoryData,
  toggleGCSModal,
  toggleGenericModal,
  toggles3Modal,
  setIsleftExpanded,
}) => {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { setMessages } = useMessageContext();
  const [chatModeAnchor, setchatModeAnchor] = useState<HTMLElement | null>(null);
  const [showChatMode, setshowChatMode] = useState<boolean>(false);
  const largedesktops = useMediaQuery(`(min-width:1440px )`);
  const { connectionStatus, isReadOnlyUser } = useCredentials();
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const date = new Date();
  useEffect(() => {
    if (clearHistoryData) {
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
  }, [clearHistoryData]);

  const handleExpandClick = () => {
    setIsChatModalOpen(true);
    setIsFullScreen(true);
    if (setShowDrawerChatbot && setIsRightExpanded) {
      setShowDrawerChatbot(false);
      setIsRightExpanded(false);
    }
  };
  const handleShrinkClick = () => {
    setIsChatModalOpen(false);
    setIsFullScreen(false);
    if (setShowDrawerChatbot && setIsRightExpanded && largedesktops) {
      setShowDrawerChatbot(true);
      setIsRightExpanded(true);
    }
  };
  const handleClick = () => {
    if (!largedesktops && position === 'right') {
      setIsChatModalOpen(true);
      setIsFullScreen(true);
    } else if (!largedesktops && position === 'left') {
      setIsleftExpanded && setIsleftExpanded(false);
    } else {
      toggleDrawer();
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 58px)', minHeight: '200px', display: 'flex' }}>
      <SideNavigation iconMenu={true} expanded={false} position={position}>
        <SideNavigation.List>
          {isExpanded && largedesktops && (
            <SideNavigation.Item
              onClick={handleClick}
              icon={position === 'left' ? <ArrowLeftIconOutline /> : <ArrowRightIconOutline />}
            />
          )}
          {!isExpanded && position === 'left' && largedesktops && (
            <SideNavigation.Item
              onClick={handleClick}
              icon={
                <TipWrapper tooltip={tooltips.sources} placement='right'>
                  <CloudArrowUpIconSolid />
                </TipWrapper>
              }
            />
          )}

          {position === 'right' && !isExpanded && (
            <SideNavigation.Item
              onClick={handleClick}
              icon={
                <TipWrapper tooltip={tooltips.chat} placement='left'>
                  <ChatBubbleOvalLeftEllipsisIconOutline />
                </TipWrapper>
              }
            />
          )}

          {!largedesktops && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TipWrapper tooltip='Local Files' placement='right'>
                  <DropZoneForSmallLayouts />
                </TipWrapper>
              }
            />
          )}
          {!largedesktops && APP_SOURCES.includes('gcs') && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TipWrapper tooltip='GCS Files' placement='right'>
                  <GCSButton isLargeDesktop={largedesktops} openModal={toggleGCSModal}></GCSButton>
                </TipWrapper>
              }
            />
          )}
          {!largedesktops && APP_SOURCES.includes('s3') && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TipWrapper tooltip='S3 Files' placement='right'>
                  <S3Component isLargeDesktop={largedesktops} openModal={toggles3Modal}></S3Component>
                </TipWrapper>
              }
            />
          )}
          {!largedesktops && APP_SOURCES.includes('web') && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TipWrapper tooltip='Web Sources' placement='right'>
                  <WebButton isLargeDesktop={largedesktops} openModal={toggleGenericModal}></WebButton>
                </TipWrapper>
              }
            ></SideNavigation.Item>
          )}
          {position === 'right' && isExpanded && (
            <>
              <Tip allowedPlacements={['left']}>
                <SideNavigation.Item
                  onClick={deleteOnClick}
                  icon={
                    <>
                      <Tip.Trigger>
                        <TrashIconOutline />
                      </Tip.Trigger>
                      <Tip.Content>{tooltips.clearChat}</Tip.Content>
                    </>
                  }
                />
              </Tip>
              <Tip allowedPlacements={['left']}>
                <SideNavigation.Item
                  onClick={handleExpandClick}
                  icon={
                    <>
                      <Tip.Trigger>
                        <ArrowsPointingOutIconOutline className='n-size-token-7' />
                      </Tip.Trigger>
                      <Tip.Content>{tooltips.maximise}</Tip.Content>
                    </>
                  }
                />
              </Tip>
              <Tip allowedPlacements={['left']}>
                <SideNavigation.Item
                  onClick={() => {
                    downloadClickHandler(
                      { conversation: messages },
                      downloadLinkRef,
                      'graph-builder-conversation.json'
                    );
                  }}
                  icon={
                    <>
                      <Tip.Trigger>
                        <ArrowDownTrayIconOutline className='n-size-token-7' />
                      </Tip.Trigger>
                      <Tip.Content>
                        Download Conversation
                        <TextLink ref={downloadLinkRef} className='!hidden'>
                          ""
                        </TextLink>
                      </Tip.Content>
                    </>
                  }
                />
              </Tip>
              {!isChatModalOpen && (
                <SideNavigation.Item
                  onClick={(e) => {
                    setchatModeAnchor(e.currentTarget);
                    setshowChatMode(true);
                  }}
                  icon={
                    <>
                      <IconButtonWithToolTip size='small' placement='left' clean label='Chat mode' text='Chat mode'>
                        <RiChatSettingsLine className='n-size-token-7' />
                      </IconButtonWithToolTip>
                      <ChatModeToggle
                        open={showChatMode}
                        closeHandler={() => setshowChatMode(false)}
                        menuAnchor={chatModeAnchor}
                        disableBackdrop={true}
                        anchorPortal={true}
                      ></ChatModeToggle>
                    </>
                  }
                ></SideNavigation.Item>
              )}
            </>
          )}
        </SideNavigation.List>
      </SideNavigation>
      {isChatModalOpen &&
        createPortal(
          <Dialog
            modalProps={{
              id: 'Chatbot-popup',
              className: 'n-p-token-4 n-rounded-lg h-[90%]',
            }}
            open={isChatModalOpen}
            size='unset'
            disableCloseButton={true}
          >
            <Dialog.Header className='flex justify-between self-end' id='chatbot-dialog-title'>
              <ExpandedChatButtonContainer
                closeChatBot={handleShrinkClick}
                deleteOnClick={deleteOnClick}
                messages={messages ?? []}
              />
            </Dialog.Header>
            <Dialog.Content className='flex flex-col n-gap-token-4 w-full grow overflow-auto'>
              <Chatbot
                isFullScreen={isFullScreen}
                clear={clearHistoryData}
                messages={messages ?? []}
                setMessages={setMessages}
                isLoading={getIsLoading(messages ?? [])}
                connectionStatus={connectionStatus}
              />
            </Dialog.Content>
          </Dialog>,
          document.body
        )}
    </div>
  );
};
export default SideNav;
