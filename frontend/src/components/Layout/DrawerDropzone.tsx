import { Drawer, Flex, StatusIndicator, Typography } from '@neo4j-ndl/react';
import DropZone from '../DropZone';
import React, { useState, useEffect, useCallback } from 'react';
import { healthStatus } from '../../services/HealthStatus';
import S3Component from '../S3Bucket';
import S3Modal from '../S3Modal';
import { DrawerProps } from '../../types';
import GCSButton from '../GCSButton';
import GCSModal from '../GCSModal';
import CustomAlert from '../Alert';
import { useAlertContext } from '../../context/Alert';
import { APP_SOURCES } from '../../utils/Constants';
import GenericButton from '../GenericButton';
import GenericModal from '../GenericModal';

const DrawerDropzone: React.FC<DrawerProps> = ({ isExpanded }) => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [showModal, setshowModal] = useState<boolean>(false);
  const [showGCSModal, setShowGCSModal] = useState<boolean>(false);
  const [showGenericModal, setshowGenericModal] = useState<boolean>(false);
  const { closeAlert, alertState } = useAlertContext();

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
  const openGCSModal = useCallback(() => {
    setShowGCSModal(true);
  }, []);
  const hideGCSModal = useCallback(() => {
    setShowGCSModal(false);
  }, []);
  const openGenericModal = useCallback(() => {
    setshowGenericModal(true);
  }, []);
  const closeGenericModal = useCallback(() => {
    setshowGenericModal(false);
  }, []);

  return (
    <div className='flex min-h-[calc(-58px+100vh)] relative'>
      <Drawer expanded={isExpanded} position='left' type='push' closeable={false}>
        <Drawer.Body className={`!overflow-hidden !w-[294px]`} style={{ height: 'intial' }}>
          {alertState.showAlert && (
            <CustomAlert
              severity={alertState.alertType}
              open={alertState.showAlert}
              handleClose={closeAlert}
              alertMessage={alertState.alertMessage}
            />
          )}
          <div className='flex h-full flex-col'>
            <div className='relative h-full'>
              <div className='flex flex-col h-full'>
                <div
                  className={`mx-6 flex flex-none items-center justify-between ${
                    process.env.ENV != 'PROD' ? 'pb-6' : 'pb-5'
                  }`}
                >
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
                    <Flex gap='6' className='h-full source-container'>
                      {APP_SOURCES != undefined && APP_SOURCES.includes('local') && (
                        <div className='px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg'>
                          <DropZone />
                        </div>
                      )}
                      {(APP_SOURCES != undefined && APP_SOURCES.includes('s3')) ||
                      (APP_SOURCES != undefined && APP_SOURCES.includes('gcs')) ? (
                        <>
                          {APP_SOURCES.includes('s3') && (
                            <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                              <S3Component openModal={openModal} />
                              <S3Modal hideModal={hideModal} open={showModal} />{' '}
                            </div>
                          )}
                          {APP_SOURCES.includes('gcs') && (
                            <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                              <GCSButton openModal={openGCSModal} />
                              <GCSModal openGCSModal={openGCSModal} open={showGCSModal} hideModal={hideGCSModal} />
                            </div>
                          )}
                        </>
                      ) : (
                        <></>
                      )}
                      <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                        <GenericButton openModal={openGenericModal}></GenericButton>
                        <GenericModal open={showGenericModal} closeHandler={closeGenericModal}></GenericModal>
                      </div>
                    </Flex>
                  </>
                ) : (
                  <>
                    {APP_SOURCES != undefined && APP_SOURCES.length === 0 ? (
                      <Flex gap='6' className='h-full source-container'>
                        <div
                          className={`px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg ${
                            process.env.ENV === 'PROD' ? 'mt-2' : ''
                          }`}
                        >
                          <DropZone />
                        </div>
                        <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <S3Component openModal={openModal} />
                          <S3Modal hideModal={hideModal} open={showModal} />
                        </div>
                        <div className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <GCSButton openModal={openGCSModal} />
                          <GCSModal openGCSModal={openGCSModal} open={showGCSModal} hideModal={hideGCSModal} />
                        </div>
                      </Flex>
                    ) : (
                      <Flex gap='6' className='h-full source-container'>
                        {APP_SOURCES != undefined && APP_SOURCES.includes('local') && (
                          <div className='px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg'>
                            <DropZone />
                          </div>
                        )}
                        {(APP_SOURCES != undefined && APP_SOURCES.includes('s3')) ||
                        (APP_SOURCES != undefined && APP_SOURCES.includes('gcs')) ? (
                          <>
                            {APP_SOURCES != undefined && APP_SOURCES.includes('s3') && (
                              <div
                                className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}
                              >
                                <S3Component openModal={openModal} />
                                <S3Modal hideModal={hideModal} open={showModal} />{' '}
                              </div>
                            )}
                            {APP_SOURCES != undefined && APP_SOURCES.includes('gcs') && (
                              <div
                                className={`outline-dashed imageBg ${process.env.ENV === 'PROD' ? 'w-[245px]' : ''}`}
                              >
                                <GCSButton openModal={openGCSModal} />
                                <GCSModal openGCSModal={openGCSModal} open={showGCSModal} hideModal={hideGCSModal} />
                              </div>
                            )}
                          </>
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
