import { Dialog, Tabs } from '@neo4j-ndl/react';
import { useState } from 'react';

export default function GraphEnhancementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <Dialog.Header className='flex justify-between self-end' id='chatbot-dialog-title'>
        Graph Enhancement Operations
      </Dialog.Header>
      <Dialog.Content className='flex flex-col n-gap-token-4 w-full grow overflow-auto'>
        <Tabs fill='underline' onChange={setactiveTab} size='large' value={activeTab}>
          <Tabs.Tab tabId={0} aria-label='Database'>
            Entity Extraction Settings
          </Tabs.Tab>
          <Tabs.Tab tabId={1} aria-label='Add database'>
            Disconnected Nodes
          </Tabs.Tab>
        </Tabs>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={0}>
          <div></div>
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={1}>
          <div></div>
        </Tabs.TabPanel>
      </Dialog.Content>
    </Dialog>
  );
}
