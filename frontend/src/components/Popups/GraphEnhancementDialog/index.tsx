import { Dialog, Tabs, Box, Typography, Flex, useMediaQuery } from '@neo4j-ndl/react';
import graphenhancement from '../../../assets/images/graph-enhancements.svg';
import { useEffect, useState } from 'react';
import DeletePopUpForOrphanNodes from './DeleteTabForOrphanNodes';
import deleteOrphanAPI from '../../../services/DeleteOrphanNodes';
import { UserCredentials } from '../../../types';
import { useCredentials } from '../../../context/UserCredentials';
import EntityExtractionSettings from './EnitityExtraction/EntityExtractionSetting';
import { useFileContext } from '../../../context/UsersFiles';
import DeduplicationTab from './Deduplication';
import { tokens } from '@neo4j-ndl/base';
import PostProcessingCheckList from './PostProcessingCheckList';

export default function GraphEnhancementDialog({
  open,
  onClose,
  closeSettingModal,
}: {
  open: boolean;
  onClose: () => void;
  closeSettingModal: () => void;
}) {
  const { breakpoints } = tokens;
  const [orphanDeleteAPIloading, setorphanDeleteAPIloading] = useState<boolean>(false);
  const { setShowTextFromSchemaDialog } = useFileContext();
  const { userCredentials } = useCredentials();
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);

  const orphanNodesDeleteHandler = async (selectedEntities: string[]) => {
    try {
      setorphanDeleteAPIloading(true);
      const response = await deleteOrphanAPI(userCredentials as UserCredentials, selectedEntities);
      setorphanDeleteAPIloading(false);
      console.log(response);
    } catch (error) {
      setorphanDeleteAPIloading(false);
      console.log(error);
    }
  };
  useEffect(() => {
    closeSettingModal();
  }, []);

  const [activeTab, setactiveTab] = useState<number>(0);
  return (
    <Dialog
      modalProps={{
        id: 'graph-enhancement-popup',
        className: 'n-p-token-4 n-rounded-lg',
      }}
      open={open}
      size='unset'
      disableCloseButton={false}
      onClose={onClose}
    >
      <Dialog.Header className='flex justify-between self-end !mb-0 '>
        <Box className='n-bg-palette-neutral-bg-weak px-4'>
          <Box className='flex flex-row items-center mb-2'>
            <img
              src={graphenhancement}
              style={{
                width: isTablet ? 170 : 220,
                height: isTablet ? 170 : 220,
                marginRight: 10,
                objectFit: 'contain',
              }}
              loading='lazy'
            />
            <Box className='flex flex-col'>
              <Typography variant={isTablet ? 'h5' : 'h2'}>Graph Enhancements</Typography>
              <Typography variant={isTablet ? 'subheading-small' : 'subheading-medium'} className='mb-2'>
                {isTablet
                  ? `This set of tools will help you enhance the quality of your Knowledge Graph`
                  : `This set of tools will help you enhance the quality of your Knowledge Graph by removing possible
                duplicated entities, disconnected nodes and set a Graph Schema for improving the quality of the entity
                extraction process`}
              </Typography>
              <Flex className='pt-2'>
                <Tabs fill='underline' onChange={setactiveTab} size={isTablet ? 'small' : 'large'} value={activeTab}>
                  <Tabs.Tab tabId={0} aria-label='Database'>
                    Entity Extraction Settings
                  </Tabs.Tab>
                  <Tabs.Tab tabId={1} aria-label='Add database'>
                    Disconnected Nodes
                  </Tabs.Tab>
                  <Tabs.Tab tabId={2} aria-label='Duplication Nodes'>
                    De-Duplication Of Nodes
                  </Tabs.Tab>
                  <Tabs.Tab tabId={3} aria-label='Duplication Nodes'>
                    Post Processing Jobs
                  </Tabs.Tab>
                </Tabs>
              </Flex>
            </Box>
          </Box>
        </Box>
      </Dialog.Header>
      <Dialog.Content className='flex flex-col n-gap-token- grow w-[90%] mx-auto'>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4' value={activeTab} tabId={0}>
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
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={2}>
          <DeduplicationTab />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={3}>
          <PostProcessingCheckList />
        </Tabs.TabPanel>
      </Dialog.Content>
    </Dialog>
  );
}
