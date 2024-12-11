import React, { useRef, useState } from 'react';
import { Dialog, SideNavigation, TextLink, Tooltip, useMediaQuery } from '@neo4j-ndl/react';
import {
  ArrowRightIconOutline,
  ArrowLeftIconOutline,
  ArrowsPointingOutIconOutline,
  ChatBubbleOvalLeftEllipsisIconOutline,
  CloudArrowUpIconSolid,
  ArrowDownTrayIconOutline,
  TrashIconOutline,
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
import TooltipWrapper from '../UI/TipWrapper';

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
  const { setMessages, isDeleteChatLoading } = useMessageContext();
  const [showChatMode, setshowChatMode] = useState<boolean>(false);
  const largedesktops = useMediaQuery(`(min-width:1440px )`);
  const { connectionStatus, isReadOnlyUser } = useCredentials();
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const anchorMenuRef = useRef<HTMLAnchorElement>(null);

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
      <SideNavigation hasIconMenu={true} isExpanded={false} position={position}>
        <SideNavigation.List>
          {isExpanded && largedesktops && (
            <SideNavigation.Item
              htmlAttributes={{ onClick: handleClick }}
              icon={
                position === 'left' ? (
                  <ArrowLeftIconOutline className='n-size-token-7' />
                ) : (
                  <ArrowRightIconOutline className='n-size-token-7' />
                )
              }
            />
          )}
          {!isExpanded && position === 'left' && largedesktops && (
            <SideNavigation.Item
              htmlAttributes={{ onClick: handleClick }}
              icon={
                <TooltipWrapper tooltip={tooltips.sources} placement='right'>
                  <CloudArrowUpIconSolid className='n-size-token-7' />
                </TooltipWrapper>
              }
            />
          )}

          {position === 'right' && !isExpanded && (
            <SideNavigation.Item
              htmlAttributes={{ onClick: handleClick }}
              icon={
                <TooltipWrapper tooltip={tooltips.chat} placement='left'>
                  <ChatBubbleOvalLeftEllipsisIconOutline className='n-size-token-7' />
                </TooltipWrapper>
              }
            />
          )}

          {!largedesktops && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TooltipWrapper tooltip='Local Files' placement='right'>
                  <DropZoneForSmallLayouts />
                </TooltipWrapper>
              }
            />
          )}
          {!largedesktops && APP_SOURCES.includes('gcs') && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TooltipWrapper tooltip='GCS Files' placement='right'>
                  <GCSButton isLargeDesktop={largedesktops} openModal={toggleGCSModal}></GCSButton>
                </TooltipWrapper>
              }
            />
          )}
          {!largedesktops && APP_SOURCES.includes('s3') && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TooltipWrapper tooltip='S3 Files' placement='right'>
                  <S3Component isLargeDesktop={largedesktops} openModal={toggles3Modal}></S3Component>
                </TooltipWrapper>
              }
            />
          )}
          {!largedesktops && APP_SOURCES.includes('web') && position === 'left' && !isReadOnlyUser && (
            <SideNavigation.Item
              icon={
                <TooltipWrapper tooltip='Web Sources' placement='right'>
                  <WebButton isLargeDesktop={largedesktops} openModal={toggleGenericModal}></WebButton>
                </TooltipWrapper>
              }
            ></SideNavigation.Item>
          )}
          {position === 'right' && isExpanded && (
            <>
              <Tooltip type='simple' placement={'left'}>
                <SideNavigation.Item
                  htmlAttributes={{ onClick: deleteOnClick }}
                  icon={
                    <>
                      <Tooltip.Trigger>
                        <TrashIconOutline className='n-size-token-7' />
                      </Tooltip.Trigger>
                      <Tooltip.Content>{tooltips.clearChat}</Tooltip.Content>
                    </>
                  }
                />
              </Tooltip>
              <Tooltip type='simple' placement={'left'}>
                <SideNavigation.Item
                  htmlAttributes={{ onClick: handleExpandClick }}
                  icon={
                    <>
                      <Tooltip.Trigger>
                        <ArrowsPointingOutIconOutline className='n-size-token-7' />
                      </Tooltip.Trigger>
                      <Tooltip.Content>{tooltips.maximise}</Tooltip.Content>
                    </>
                  }
                />
              </Tooltip>
              <Tooltip type='simple' placement={'left'}>
                <SideNavigation.Item
                  htmlAttributes={{
                    onClick: () => {
                      downloadClickHandler(
                        { conversation: messages },
                        downloadLinkRef,
                        'graph-builder-conversation.json'
                      );
                    },
                  }}
                  icon={
                    <>
                      <Tooltip.Trigger>
                        <ArrowDownTrayIconOutline className='n-size-token-7' />
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        Download Conversation
                        <TextLink ref={downloadLinkRef} className='!hidden'>
                          ""
                        </TextLink>
                      </Tooltip.Content>
                    </>
                  }
                />
              </Tooltip>
              {!isChatModalOpen && (
                <SideNavigation.Item
                  ref={anchorMenuRef}
                  icon={
                    <>
                      <IconButtonWithToolTip
                        onClick={() => {
                          setshowChatMode(true);
                        }}
                        size='small'
                        placement='left'
                        clean
                        label='Chat mode'
                        text='Chat mode'
                      >
                        <RiChatSettingsLine className='n-size-token-7' />
                      </IconButtonWithToolTip>
                      <ChatModeToggle
                        open={showChatMode}
                        closeHandler={(_, reason) => {
                          if (reason.type === 'backdropClick') {
                            setshowChatMode(false);
                          }
                        }}
                        menuAnchor={anchorMenuRef}
                        isRoot={false}
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
            isOpen={isChatModalOpen}
            size='unset'
            hasDisabledCloseButton={true}
          >
            <Dialog.Header className='flex justify-between self-end' htmlAttributes={{ id: 'chatbot-dialog-title' }}>
              <ExpandedChatButtonContainer
                isFullScreen={isFullScreen}
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
                isDeleteChatLoading={isDeleteChatLoading}
              />
            </Dialog.Content>
          </Dialog>,
          document.body
        )}
    </div>
  );
};
export default SideNav;
