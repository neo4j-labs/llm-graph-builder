import React, { useState } from 'react';
import { Modal, SideNavigation } from '@neo4j-ndl/react';
import { ArrowRightIconOutline, ArrowLeftIconOutline, TrashIconOutline, ExpandIcon } from '@neo4j-ndl/react/icons';
import { SideNavProps } from '../../types';
import Chatbot from '../Chatbot';
import { createPortal } from 'react-dom';
import { useMessageContext } from '../../context/UserMessages';
import { getIsLoading } from '../../utils/Utils';

const SideNav: React.FC<SideNavProps> = ({ position, toggleDrawer, isExpanded, deleteOnClick }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { messages, setMessages } = useMessageContext();

  console.log('messages', messages);

  const handleExpandClick = () => {
    setIsChatbotOpen(true);
  };
  const handleShrinkClick = () => {
    setIsChatbotOpen(false);
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
              {/* <SideNavigation.Item selected={isSelected} disabled={messages.length === 1} icon={<TrashIconOutline className="n-size-full" onClick={deleteOnClick} />} />
              <SideNavigation.Item selected={isSelected} icon={<ExpandIcon className="n-size-full" />} onClick={handleExpandClick} /> */}
            </>
          )}
        </SideNavigation.List>
      </SideNavigation>
      {isChatbotOpen &&
        createPortal(
          <Modal
            modalProps={{
              id: 'Chatbot',
              className: 'n-p-token-4 n-bg-neutral-10 n-rounded-lg',
            }}
            open={isChatbotOpen}
            onClose={handleShrinkClick}
            size='unset'
          >
            <Chatbot messages={messages} setMessages={setMessages} isLoading={getIsLoading(messages)} />
          </Modal>,
          document.body
        )}
    </div>
  );
};
export default SideNav;
