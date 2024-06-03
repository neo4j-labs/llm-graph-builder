import React, { useState } from 'react';
import { Dialog, SideNavigation } from '@neo4j-ndl/react';
import { ArrowRightIconOutline, ArrowLeftIconOutline, TrashIconOutline, ExpandIcon } from '@neo4j-ndl/react/icons';
import { SideNavProps } from '../../types';
import Chatbot from '../Chatbot';
import { createPortal } from 'react-dom';
import { useMessageContext } from '../../context/UserMessages';
import { getIsLoading } from '../../utils/Utils';
import IconsPlacement from '../IconsPlacement';

const SideNav: React.FC<SideNavProps> = ({ position, toggleDrawer, isExpanded, deleteOnClick, setShowDrawerChatbot, setIsRightExpanded }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isFullScreen, setIsFullScreen]= useState(false);
  const { messages, setMessages } = useMessageContext();

  console.log('messages', messages);

  const handleExpandClick = () => {
    setIsChatbotOpen(true);
    setIsFullScreen(true);
    if (setShowDrawerChatbot && setIsRightExpanded) {
      setShowDrawerChatbot(false);
      setIsRightExpanded(false);
    }
  };
  const handleShrinkClick = () => {
    setIsChatbotOpen(false);
    setIsFullScreen(false);
    if (setShowDrawerChatbot && setIsRightExpanded) {
      setShowDrawerChatbot(true);
      setIsRightExpanded(true);
    }
  };
  const handleClick = () => {
    toggleDrawer();
  };
  return (
    <div style={{ height: 'calc(100vh - 58px)', minHeight: '200px', display: 'flex' }}>
      <SideNavigation iconMenu={true} expanded={false} position={position}>
        <SideNavigation.List>
          <SideNavigation.Item
            onClick={handleClick}
            icon={
              isExpanded ? (
                position === 'left' ? (
                  <ArrowLeftIconOutline />
                ) : (
                  <ArrowRightIconOutline />
                )
              ) : position === 'left' ? (
                <ArrowRightIconOutline />
              ) : (
                <ArrowLeftIconOutline />
              )
            }
          />
          {position === 'right' && (
            <>
              <SideNavigation.Item
                disabled={messages.length === 1}
                icon={<TrashIconOutline className='n-size-full' onClick={deleteOnClick} />}
              />
              <SideNavigation.Item icon={<ExpandIcon className='n-size-full' />} onClick={handleExpandClick} />
            </>
          )}
        </SideNavigation.List>
      </SideNavigation>
      {isChatbotOpen &&
        createPortal(
          <Dialog
            modalProps={{
              id: 'Chatbot-popup',
              className: 'n-p-token-4 n-bg-neutral-10 n-rounded-lg h-[90%]',
            }}
            open={isChatbotOpen}
            size='unset'
            disableCloseButton={true}
          >
            <Dialog.Header className='flex justify-between' id='chatbot-dialog-title'>
              <p>{'Chat-bot'}</p>
              <IconsPlacement closeChatBot={handleShrinkClick} deleteOnClick={deleteOnClick} messages={messages} />
            </Dialog.Header>
            <Dialog.Content className='flex flex-col n-gap-token-4 w-full grow overflow-auto border'>
                  <Chatbot isFullScreen={isFullScreen} messages={messages} setMessages={setMessages} isLoading={getIsLoading(messages)} />
            </Dialog.Content>
           

          </Dialog>,
          document.body
        )}
    </div>
  );
};
export default SideNav;
