import { Dialog, Tabs } from '@neo4j-ndl/react';
import youtubelogo from '../assets/images/youtube.png';
import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';
import weblogo from '../assets/images/web-svgrepo-com.svg';
import { useState } from 'react';
import WikipediaInput from './WikipediaInput';
import WebInput from './WebInput';
import YoutubeInput from './YoutubeInput';
import { APP_SOURCES } from '../utils/Constants';

export default function GenericModal({
  open,
  closeHandler,
  isOnlyYoutube,
  isOnlyWikipedia,
  isOnlyWeb,
}: {
  open: boolean;
  closeHandler: () => void;
  isOnlyYoutube?: boolean;
  isOnlyWikipedia?: boolean;
  isOnlyWeb?: boolean;
}) {
  const [activeTab, setactiveTab] = useState<number>(isOnlyYoutube ? 0 : isOnlyWikipedia ? 1 : isOnlyWeb ? 2 : 0);
  return (
    <Dialog open={open} onClose={closeHandler}>
      <Dialog.Header>
        <Tabs fill='underline' onChange={setactiveTab} size='large' value={activeTab}>
          {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && (
            <Tabs.Tab tabId={0} aria-label='Database'>
              <img src={youtubelogo} className={`brandimg`}></img>
            </Tabs.Tab>
          )}
          {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && (
            <Tabs.Tab tabId={1} aria-label='Add database'>
              <img src={wikipedialogo} className={`brandimg`}></img>
            </Tabs.Tab>
          )}
          {APP_SOURCES != undefined && APP_SOURCES.includes('web') && (
            <Tabs.Tab tabId={2} aria-label='Inbox'>
              <img src={weblogo} className={`brandimg !w-[70px] !h-[70px]`}></img>
            </Tabs.Tab>
          )}
        </Tabs>
        {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={0}>
            <YoutubeInput />
          </Tabs.TabPanel>
        )}
        {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={1}>
            <WikipediaInput />
          </Tabs.TabPanel>
        )}
        {APP_SOURCES != undefined && APP_SOURCES.includes('web') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={2}>
            <WebInput />
          </Tabs.TabPanel>
        )}
      </Dialog.Header>
    </Dialog>
  );
}
