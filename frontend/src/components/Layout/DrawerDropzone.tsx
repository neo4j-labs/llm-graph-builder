import { Drawer, Label, Typography } from '@neo4j-ndl/react';
import DropZone from '../DropZone';
import { useState, useEffect } from 'react';
import { healthStatus } from '../../services/HealthStatus';

export default function DrawerDropzone() {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
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
  return (
    <div
      className='relative'
      style={{
        userSelect: 'auto',
        width: '342px',
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
                <div className='mx-6 flex flex-none items-center justify-between pb-6'>
                  <Typography variant='body-medium' style={{ display: 'flex', marginBlock: '10px', marginLeft: '5px' }}>
                    Backend connection Status:
                    <Typography variant='body-medium'>
                      {!isBackendConnected ? (
                        <Label color='danger'>Disconnected</Label>
                      ) : (
                        <Label color='success'>Connected</Label>
                      )}
                    </Typography>
                  </Typography>
                </div>
                <div className='h-full px-6'>
                  <DropZone isBackendConnected={isBackendConnected} />
                </div>
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer>
    </div>
  );
}
