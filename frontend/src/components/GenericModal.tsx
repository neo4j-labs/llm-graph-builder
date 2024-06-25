import { Dialog, Tabs, Typography } from '@neo4j-ndl/react';
import youtubelogo from '../assets/images/youtube.png';
import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';
import weblogo from '../assets/images/web-svgrepo-com.svg';
import { useState } from 'react';
import YoutubeInput from './YoutubeInput';
import WikipediaInput from './WikipediaInput';
import WebInput from './WebInput';

export default function GenericModal({ open, closeHandler }: { open: boolean; closeHandler: () => void }) {
  const [activeTab, setactiveTab] = useState<number>(0);
  return (
    <Dialog open={open} onClose={closeHandler}>
      <Dialog.Header>
        <Tabs fill='underline' onChange={setactiveTab} size='large' value={activeTab}>
          <Tabs.Tab tabId={0} aria-label='Database'>
            <img src={youtubelogo} className={`brandimg`}></img>
          </Tabs.Tab>
          <Tabs.Tab tabId={1} aria-label='Add database'>
            <img src={wikipedialogo} className={`brandimg`}></img>
          </Tabs.Tab>
          <Tabs.Tab tabId={2} aria-label='Inbox'>
            <img src={weblogo} className={`brandimg`}></img>
          </Tabs.Tab>
        </Tabs>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={0}>
          <YoutubeInput />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={1}>
          <WikipediaInput />
        </Tabs.TabPanel>
        <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={2}>
          <WebInput />
        </Tabs.TabPanel>
      </Dialog.Header>
    </Dialog>
  );
}
