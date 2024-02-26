import { Drawer, Flex, StatusIndicator, Typography } from '@neo4j-ndl/react';
import DropZone from '../DropZone';
import { useState, useEffect } from 'react';
import { healthStatus } from '../../services/HealthStatus';
import S3Component from '../S3Bucket';
import S3Modal from '../S3Modal';
import GcsBucket from '../GcsBucket';

export default function DrawerDropzone() {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [showModal, setshowModal] = useState<boolean>(false);

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

  return (
    <div
      className='relative'
      style={{
        userSelect: 'auto',
        width: '294px',
        maxWidth: '372px',
        minWidth: '250px',
        boxSizing: 'border-box',
        flexShrink: '0',
      }}
    >
      <Drawer expanded isResizeable closeable={false}>
        <Drawer.Body style={{ overflow: 'hidden' }}>
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
                    <Flex
                      gap='8'
                      className='s3Container outline-dashed outline-2 outline-offset-2 outline-gray-100 h-[66%]'
                    >
                      <S3Component openModal={openModal} />
                      <S3Modal hideModal={hideModal} open={showModal} />
                      <GcsBucket />
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
}
