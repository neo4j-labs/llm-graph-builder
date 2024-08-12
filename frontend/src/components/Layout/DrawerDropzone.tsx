import { Drawer, Flex, StatusIndicator, Typography } from '@neo4j-ndl/react';
import DropZone from '../DataSources/Local/DropZone';
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { healthStatus } from '../../services/HealthStatus';
import S3Component from '../DataSources/AWS/S3Bucket';
import { DrawerProps } from '../../types';
import GCSButton from '../DataSources/GCS/GCSButton';
import CustomAlert from '../UI/Alert';
import { useAlertContext } from '../../context/Alert';
import { APP_SOURCES } from '../../utils/Constants';
import GenericButton from '../WebSources/GenericSourceButton';
import GenericModal from '../WebSources/GenericSourceModal';
import FallBackDialog from '../UI/FallBackDialog';
const S3Modal = lazy(() => import('../DataSources/AWS/S3Modal'));
const GCSModal = lazy(() => import('../DataSources/GCS/GCSModal'));

const DrawerDropzone: React.FC<DrawerProps> = ({
  isExpanded,
  toggleS3Modal,
  toggleGCSModal,
  toggleGenericModal,
  shows3Modal,
  showGCSModal,
  showGenericModal,
}) => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
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

  const isYoutubeOnlyCheck = useMemo(
    () => APP_SOURCES?.includes('youtube') && !APP_SOURCES.includes('wiki') && !APP_SOURCES.includes('web'),
    [APP_SOURCES]
  );
  const isWikipediaOnlyCheck = useMemo(
    () => APP_SOURCES?.includes('wiki') && !APP_SOURCES.includes('youtube') && !APP_SOURCES.includes('web'),
    [APP_SOURCES]
  );
  const iswebOnlyCheck = useMemo(
    () => APP_SOURCES?.includes('web') && !APP_SOURCES.includes('youtube') && !APP_SOURCES.includes('wiki'),
    [APP_SOURCES]
  );

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
                    process.env.VITE_ENV != 'PROD' ? 'pb-6' : 'pb-5'
                  }`}
                >
                  {process.env.VITE_ENV != 'PROD' && (
                    <Typography variant='body-medium' className='flex items-center content-center'>
                      <Typography variant='body-medium'>
                        {!isBackendConnected ? <StatusIndicator type='danger' /> : <StatusIndicator type='success' />}
                      </Typography>
                      <span>Backend connection status</span>
                    </Typography>
                  )}
                </div>
                {process.env.VITE_ENV != 'PROD' ? (
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
                          {(APP_SOURCES.includes('youtube') ||
                            APP_SOURCES.includes('wiki') ||
                            APP_SOURCES.includes('web')) && (
                            <div
                              className={`outline-dashed imageBg ${process.env.VITE_ENV === 'PROD' ? 'w-[245px]' : ''}`}
                            >
                              <GenericButton openModal={toggleGenericModal}></GenericButton>
                              <GenericModal
                                isOnlyYoutube={isYoutubeOnlyCheck}
                                isOnlyWikipedia={isWikipediaOnlyCheck}
                                isOnlyWeb={iswebOnlyCheck}
                                open={showGenericModal}
                                closeHandler={toggleGenericModal}
                              ></GenericModal>
                            </div>
                          )}
                          {APP_SOURCES.includes('s3') && (
                            <div
                              className={`outline-dashed imageBg ${process.env.VITE_ENV === 'PROD' ? 'w-[245px]' : ''}`}
                            >
                              <S3Component openModal={toggleS3Modal} />
                              <Suspense fallback={<FallBackDialog />}>
                                <S3Modal hideModal={toggleS3Modal} open={shows3Modal} />
                              </Suspense>
                            </div>
                          )}
                          {APP_SOURCES.includes('gcs') && (
                            <div
                              className={`outline-dashed imageBg ${process.env.VITE_ENV === 'PROD' ? 'w-[245px]' : ''}`}
                            >
                              <GCSButton openModal={toggleGCSModal} />
                              <Suspense fallback={<FallBackDialog />}>
                                <GCSModal
                                  openGCSModal={toggleGCSModal}
                                  open={showGCSModal}
                                  hideModal={toggleGCSModal}
                                />
                              </Suspense>
                            </div>
                          )}
                        </>
                      ) : (
                        <></>
                      )}
                    </Flex>
                  </>
                ) : (
                  <>
                    <Flex gap='6' className='h-full source-container'>
                      {APP_SOURCES != undefined && APP_SOURCES.includes('local') && (
                        <div className='px-6 outline-dashed outline-2 outline-offset-2 outline-gray-100 imageBg'>
                          <DropZone />
                        </div>
                      )}
                      {((APP_SOURCES != undefined && APP_SOURCES.includes('youtube')) ||
                        (APP_SOURCES != undefined && APP_SOURCES.includes('wiki')) ||
                        (APP_SOURCES != undefined && APP_SOURCES.includes('web'))) && (
                        <div className={`outline-dashed imageBg ${process.env.VITE_ENV === 'PROD' ? 'w-[245px]' : ''}`}>
                          <GenericButton openModal={toggleGenericModal}></GenericButton>
                          <GenericModal
                            isOnlyYoutube={isYoutubeOnlyCheck}
                            isOnlyWikipedia={isWikipediaOnlyCheck}
                            isOnlyWeb={iswebOnlyCheck}
                            open={showGenericModal}
                            closeHandler={toggleGenericModal}
                          ></GenericModal>
                        </div>
                      )}
                      {(APP_SOURCES != undefined && APP_SOURCES.includes('s3')) ||
                      (APP_SOURCES != undefined && APP_SOURCES.includes('gcs')) ? (
                        <>
                          {APP_SOURCES != undefined && APP_SOURCES.includes('s3') && (
                            <div
                              className={`outline-dashed imageBg ${process.env.VITE_ENV === 'PROD' ? 'w-[245px]' : ''}`}
                            >
                              <S3Component openModal={toggleS3Modal} />
                              <Suspense fallback={<FallBackDialog />}>
                                <S3Modal hideModal={toggleS3Modal} open={shows3Modal} />
                              </Suspense>
                            </div>
                          )}
                          {APP_SOURCES != undefined && APP_SOURCES.includes('gcs') && (
                            <div
                              className={`outline-dashed imageBg ${process.env.VITE_ENV === 'PROD' ? 'w-[245px]' : ''}`}
                            >
                              <GCSButton openModal={toggleGCSModal} />
                              <GCSModal openGCSModal={toggleGCSModal} open={showGCSModal} hideModal={toggleGCSModal} />
                            </div>
                          )}
                        </>
                      ) : (
                        <></>
                      )}
                    </Flex>
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
