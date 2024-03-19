import { Drawer, Flex, StatusIndicator, Typography } from '@neo4j-ndl/react';
import DropZone from '../DropZone';
import React, { useState, useEffect } from 'react';
import { healthStatus } from '../../services/HealthStatus';
import S3Component from '../S3Bucket';
import S3Modal from '../S3Modal';
import Wikipedia from '../Wikipedia';
import { DrawerProps } from '../../types';
import YouTubeButton from '../YoutubeButton';
import YoutubeModal from '../YoutubeModal';
import WikipediaModal from '../WikipediaModal';

const DrawerDropzone: React.FC<DrawerProps> = ({ isExpanded }) => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [showModal, setshowModal] = useState<boolean>(false);
  const [showWikiepediaModal, setShowWikiepediaModal] = useState<boolean>(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState<boolean>(false);

  useEffect(() => {
    async function getHealthStatus() {
      try {
        const response = await healthStatus();
        setIsBackendConnected(response.data.healthy);
      } catch (error) {
        setIsBackendConnected(false);
      }
    }
    getHealthStatus();
  }, []);

  const openModal = () => {
    setshowModal(true);
  };
  const hideModal = () => {
    setshowModal(false);
  };
  const openWikipediaModal = () => {
    setShowWikiepediaModal(true);
  };
  const closeWikipediaModal = () => {
    setShowWikiepediaModal(false);
  };
  const hideYoutubeModal = () => {
    setShowYoutubeModal(false);
  };
  const openYoutubeModal = () => {
    setShowYoutubeModal(true);
  };
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '650px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Drawer
        expanded={isExpanded}
        isResizeable={false}
        position='left'
        type='push'
        closeable={false}
        key={'leftdrawer'}
        onExpandedChange={function Ha() {}}
      >
        <Drawer.Body style={{ overflow: 'hidden', height: 'intial' }}>
          <div className='flex h-full flex-col'>
            <div className='relative h-full'>
              <div className='flex flex-col h-full'>
                <div className='mx-6 flex flex-none items-center justify-between pb-6 '>
                  <Typography
                    variant='body-medium'
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Typography variant='body-medium'>
                      {!isBackendConnected ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
                    </Typography>
                    <span>Backend connection status</span>
                  </Typography>
                </div>
                {isBackendConnected && (
                  <Flex gap='6' className='h-full'>
                    <div className='px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg'>
                      <DropZone />
                    </div>
                    <div className='outline-dashed imageBg'>
                      <YouTubeButton openModal={openYoutubeModal} />
                      <YoutubeModal hideModal={hideYoutubeModal} open={showYoutubeModal} />
                    </div>
                    <div className='outline-dashed imageBg'>
                      <Wikipedia openModal={openWikipediaModal} />
                      <WikipediaModal hideModal={closeWikipediaModal} open={showWikiepediaModal} />
                    </div>
                    <Flex gap='8' className='s3Container outline-dashed outline-2 outline-offset-2 outline-gray-100 '>
                      <S3Component openModal={openModal} />
                      <S3Modal hideModal={hideModal} open={showModal} />
                    </Flex>
                  </Flex>
                )}
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer>
    </div>
  );
};

export default DrawerDropzone;
