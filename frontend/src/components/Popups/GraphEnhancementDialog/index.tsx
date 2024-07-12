import { Dialog, Tabs, Box, Typography, Flex } from '@neo4j-ndl/react';
import graphenhancement from '../../../assets/images/graph-enhancements.svg';
import { useEffect, useState } from 'react';
import DeletePopUpForOrphanNodes from './DeleteTabForOrphanNodes';
import deleteOrphanAPI from '../../../services/DeleteOrphanNodes';
import { UserCredentials } from '../../../types';
import { useCredentials } from '../../../context/UserCredentials';
import EntityExtractionSettings from '../Settings/EntityExtractionSetting';
import { AlertColor, AlertPropsColorOverrides } from '@mui/material';
import { OverridableStringUnion } from '@mui/types';
import { useFileContext } from '../../../context/UsersFiles';

export default function GraphEnhancementDialog({
  open,
  onClose,
  closeSettingModal
}: {
  open: boolean;
  onClose: () => void;
  showAlert: (
    alertmsg: string,
    alerttype: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined
  ) => void;
  closeSettingModal:()=>void
}) {
  const [orphanDeleteAPIloading, setorphanDeleteAPIloading] = useState<boolean>(false);
  const { setShowTextFromSchemaDialog } = useFileContext();
  const { userCredentials } = useCredentials();

  const orphanNodesDeleteHandler = async (selectedEntities: string[]) => {
    try {
      setorphanDeleteAPIloading(true);
      const response = await deleteOrphanAPI(userCredentials as UserCredentials, selectedEntities);
      setorphanDeleteAPIloading(false);
      console.log(response);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    closeSettingModal()
  }, [])
  
  const [activeTab, setactiveTab] = useState<number>(0);
  return (
    <Dialog
      modalProps={{
        id: 'graph-enhancement-popup',
        className: 'n-p-token-4 n-rounded-lg h-[90%]',
      }}
      open={open}
      size='unset'
      disableCloseButton={false}
      onClose={onClose}
    >
      <Dialog.Header className='flex justify-between self-end !mb-0 '>
        <Box className='n-bg-palette-neutral-bg-weak px-4'>
          <Box className='flex flex-row items-center mb-2'>
            <img src={graphenhancement} style={{ width: 250, height: 250, marginRight: 10 }} loading='lazy' />
            <Box className='flex flex-col'>
              <Typography variant='h2'>Graph Enhancements</Typography>
              <Typography variant='subheading-medium' className='mb-2'>
                This set of tools will help you enhance the quality of your Knowledge Graph by removing possible
                duplicated entities, disconnected nodes and set a Graph Schema for improving the quality of the entity
                extraction process
              </Typography>
              <Flex className='pt-2'>
                <Tabs fill='underline' onChange={setactiveTab} size='large' value={activeTab}>
                  <Tabs.Tab tabId={0} aria-label='Database'>
                    Entity Extraction Settings
                  </Tabs.Tab>
                  <Tabs.Tab tabId={1} aria-label='Add database'>
                    Disconnected Nodes
                  </Tabs.Tab>
                </Tabs>
              </Flex>
            </Box>
          </Box>
        </Box>
      </Dialog.Header>
      <Dialog.Content className='flex flex-col n-gap-token- grow w-[90%] mx-auto'>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={0}>
          <div className='w-[80%] mx-auto'>
            <EntityExtractionSettings
              view='Tabs'
              openTextSchema={() => {
                setShowTextFromSchemaDialog({ triggeredFrom: 'enhancementtab', show: true });
              }}
              colseEnhanceGraphSchemaDialog={onClose}
              settingView='headerView'
            />
          </div>
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={1}>
          <DeletePopUpForOrphanNodes deleteHandler={orphanNodesDeleteHandler} loading={orphanDeleteAPIloading} />
        </Tabs.TabPanel>
      </Dialog.Content>
    </Dialog>
  );
}