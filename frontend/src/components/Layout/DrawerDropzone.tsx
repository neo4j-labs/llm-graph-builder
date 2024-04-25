import { Drawer, Flex, StatusIndicator, Typography } from '@neo4j-ndl/react';
import DropZone from '../DropZone';
import React, { useState, useEffect, useCallback } from 'react';
import { healthStatus } from '../../services/HealthStatus';
import S3Component from '../S3Bucket';
import S3Modal from '../S3Modal';
import Wikipedia from '../Wikipedia';
import { DrawerProps } from '../../types';
import YouTubeButton from '../YoutubeButton';
import YoutubeModal from '../YoutubeModal';
import WikipediaModal from '../WikipediaModal';
import GCSButton from '../GCSButton';
import GCSModal from '../GCSModal';

const DrawerDropzone: React.FC<DrawerProps> = ({ isExpanded }) => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [showModal, setshowModal] = useState<boolean>(false);
  const [showWikiepediaModal, setShowWikiepediaModal] = useState<boolean>(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState<boolean>(false);
  const [showGCSModal, setShowGCSModal] = useState<boolean>(false);

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

  const openModal = useCallback(() => {
    setshowModal(true);
  }, []);
  const hideModal = useCallback(() => {
    setshowModal(false);
  }, []);
  const openWikipediaModal = useCallback(() => {
    setShowWikiepediaModal(true);
  }, []);
  const closeWikipediaModal = useCallback(() => {
    setShowWikiepediaModal(false);
  }, []);
  const hideYoutubeModal = useCallback(() => {
    setShowYoutubeModal(false);
  }, []);
  const openYoutubeModal = useCallback(() => {
    setShowYoutubeModal(true);
  }, []);
  const openGCSModal = useCallback(() => {
    setShowGCSModal(true);
  }, []);
  const hideGCSModal = useCallback(() => {
    setShowGCSModal(false);
  }, []);

  const sources =
    process.env.REACT_APP_SOURCES !== ''
      ? process.env.REACT_APP_SOURCES?.split(',') || []
      : process.env.REACT_APP_SOURCES;

  return (
    <div className='flex min-h-[650px] overflow-hidden relative'>
      <Drawer
        expanded={isExpanded}
        isResizeable={false}
        position='left'
        type='push'
        closeable={false}
        key={'leftdrawer'}
      >
        <Drawer.Body className='!overflow-hidden' style={{ height: 'intial' }}>
          <div className='flex h-full flex-col'>
            <div className='relative h-full'>
              <div className='flex flex-col h-full'>
                <div className='mx-6 flex flex-none items-center justify-between pb-6 '>
                  {process.env.ENV != 'PROD' && (
                    <Typography variant='body-medium' className='flex items-center content-center'>
                      <Typography variant='body-medium'>
                        {!isBackendConnected ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
                      </Typography>
                      <span>Backend connection status</span>
                    </Typography>
                  )}
                </div>
                {process.env.ENV != 'PROD' ? (
                  <>
                    {isBackendConnected && sources.length === 0 ? (
                      <Flex gap='6' className='h-full'>
                        <div
                          className={`px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg ${
                            process.env.ENV === 'PROD' ? 'mt-2' : ''
                          }`}
                        >
                          <DropZone />
                        </div>
                        <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <YouTubeButton openModal={openYoutubeModal} />
                          <YoutubeModal hideModal={hideYoutubeModal} open={showYoutubeModal} />
                        </div>
                        <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <Wikipedia openModal={openWikipediaModal} />
                          <WikipediaModal hideModal={closeWikipediaModal} open={showWikiepediaModal} />
                        </div>
                        <Flex
                          className={`s3Container outline-dashed outline-2 outline-offset-2 outline-gray-100 ${
                            process.env.ENV === 'PROD' ? 'w-[245px]' : ''
                          }`}
                        >
                          <>
                            <S3Component openModal={openModal} />
                            <S3Modal hideModal={hideModal} open={showModal} />
                          </>
                          <>
                            <GCSButton openModal={openGCSModal} />
                            <GCSModal open={showGCSModal} hideModal={hideGCSModal} />
                          </>
                        </Flex>
                      </Flex>
                    ) : (
                      <Flex gap='6' className='h-full'>
                        {sources.includes('local') && (
                          <div className='px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg'>
                            <DropZone />
                          </div>
                        )}
                        {sources.includes('youtube') && (
                          <div className='outline-dashed imageBg'>
                            <YouTubeButton openModal={openYoutubeModal} />
                            <YoutubeModal hideModal={hideYoutubeModal} open={showYoutubeModal} />
                          </div>
                        )}
                        {sources.includes('wiki') && (
                          <div className='outline-dashed imageBg'>
                            <Wikipedia openModal={openWikipediaModal} />
                            <WikipediaModal hideModal={closeWikipediaModal} open={showWikiepediaModal} />
                          </div>
                        )}
                        {sources.includes('s3') || sources.includes('gcs') ? (
                          <Flex className='s3Container outline-dashed outline-2 outline-offset-2 outline-gray-100 '>
                            {sources.includes('s3') && (
                              <>
                                <S3Component openModal={openModal} />
                                <S3Modal hideModal={hideModal} open={showModal} />{' '}
                              </>
                            )}
                            {sources.includes('gcs') && (
                              <>
                                <GCSButton openModal={openGCSModal} />
                                <GCSModal open={showGCSModal} hideModal={hideGCSModal} />
                              </>
                            )}
                          </Flex>
                        ) : (
                          <></>
                        )}
                      </Flex>
                    )}
                  </>
                ) : (
                  <>
                    {sources.length === 0 ? (
                      <Flex gap='6' className='h-full'>
                        <div
                          className={`px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg ${
                            process.env.ENV === 'PROD' ? 'mt-2' : ''
                          }`}
                        >
                          <DropZone />
                        </div>
                        <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <YouTubeButton openModal={openYoutubeModal} />
                          <YoutubeModal hideModal={hideYoutubeModal} open={showYoutubeModal} />
                        </div>
                        <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <Wikipedia openModal={openWikipediaModal} />
                          <WikipediaModal hideModal={closeWikipediaModal} open={showWikiepediaModal} />
                        </div>
                        <Flex
                          className={`s3Container outline-dashed outline-2 outline-offset-2 outline-gray-100 ${
                            process.env.ENV === 'PROD' ? 'w-[245px]' : ''
                          }`}
                        >
                          <>
                            <S3Component openModal={openModal} />
                            <S3Modal hideModal={hideModal} open={showModal} />
                          </>
                          <>
                            <GCSButton openModal={openGCSModal} />
                            <GCSModal open={showGCSModal} hideModal={hideGCSModal} />
                          </>
                        </Flex>
                      </Flex>
                    ) : (
                      <Flex gap='6' className='h-full'>
                        {sources.includes('local') && (
                          <div className='px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg'>
                            <DropZone />
                          </div>
                        )}
                        {sources.includes('youtube') && (
                          <div className='outline-dashed imageBg'>
                            <YouTubeButton openModal={openYoutubeModal} />
                            <YoutubeModal hideModal={hideYoutubeModal} open={showYoutubeModal} />
                          </div>
                        )}
                        {sources.includes('wiki') && (
                          <div className='outline-dashed imageBg'>
                            <Wikipedia openModal={openWikipediaModal} />
                            <WikipediaModal hideModal={closeWikipediaModal} open={showWikiepediaModal} />
                          </div>
                        )}
                        {sources.includes('s3') || sources.includes('gcs') ? (
                          <Flex className='s3Container outline-dashed outline-2 outline-offset-2 outline-gray-100 '>
                            {sources.includes('s3') && (
                              <>
                                <S3Component openModal={openModal} />
                                <S3Modal hideModal={hideModal} open={showModal} />{' '}
                              </>
                            )}
                            {sources.includes('gcs') && (
                              <>
                                <GCSButton openModal={openGCSModal} />
                                <GCSModal open={showGCSModal} hideModal={hideGCSModal} />
                              </>
                            )}
                          </Flex>
                        ) : (
                          <></>
                        )}
                      </Flex>
                    )}
                  </>
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
