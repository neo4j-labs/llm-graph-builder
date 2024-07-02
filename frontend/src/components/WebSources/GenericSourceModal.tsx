import { Box, Dialog, Tabs, Typography } from '@neo4j-ndl/react';
import youtubelogo from '../../assets/images/youtube.png';
import wikipedialogo from '../../assets/images/Wikipedia-logo-v2.svg';
import weblogo from '../../assets/images/web-svgrepo-com.svg';
import { useState } from 'react';
import WikipediaInput from './WikiPedia/WikipediaInput';
import WebInput from './Web/WebInput';
import YoutubeInput from './Youtube/YoutubeInput';
import { APP_SOURCES } from '../../utils/Constants';
import Neo4jRetrievalLogo from '../../assets/images/Neo4jRetrievalLogo.png';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <Dialog open={open} onClose={closeHandler}>
      <Dialog.Header>
        <Box className='flex flex-row pb-6 items-center mb-2'>
          <img src={Neo4jRetrievalLogo} style={{ width: 95, height: 95, marginRight: 10 }} loading='lazy' />
          <Box className='flex flex-col'>
            <Typography variant='h2'>Web Sources</Typography>
            <Typography variant='body-medium' className='mb-2'>
              Convert Any Web Source to Knoweldge graph
            </Typography>
          </Box>
        </Box>
        <Tabs fill='underline' onChange={setactiveTab} size='large' value={activeTab}>
          {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && (
            <Tabs.Tab tabId={0} aria-label='Database' disabled={isLoading}>
              <img src={youtubelogo} className={`brandimg`}></img>
            </Tabs.Tab>
          )}
          {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && (
            <Tabs.Tab tabId={1} aria-label='Add database' disabled={isLoading}>
              <img src={wikipedialogo} className={`brandimg`}></img>
            </Tabs.Tab>
          )}
          {APP_SOURCES != undefined && APP_SOURCES.includes('web') && (
            <Tabs.Tab tabId={2} aria-label='Inbox' disabled={isLoading}>
              <img src={weblogo} className={`brandimg !w-[70px] !h-[70px]`}></img>
            </Tabs.Tab>
          )}
        </Tabs>
        {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={0}>
            <YoutubeInput setIsLoading={setIsLoading} />
          </Tabs.TabPanel>
        )}
        {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={1}>
            <WikipediaInput setIsLoading={setIsLoading} />
          </Tabs.TabPanel>
        )}
        {APP_SOURCES != undefined && APP_SOURCES.includes('web') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={2}>
            <WebInput setIsLoading={setIsLoading} />
          </Tabs.TabPanel>
        )}
      </Dialog.Header>
    </Dialog>
  );
}
