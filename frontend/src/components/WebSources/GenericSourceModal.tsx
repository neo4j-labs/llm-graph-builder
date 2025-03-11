import { Dialog, Tabs, Typography } from '@neo4j-ndl/react';
import youtubelightmodelogo from '../../assets/images/youtube-lightmode.svg';
import youtubedarkmodelogo from '../../assets/images/youtube-darkmode.svg';
import wikipedialogo from '../../assets/images/wikipedia.svg';
import weblogo from '../../assets/images/web.svg';
import webdarkmode from '../../assets/images/web-darkmode.svg';
import wikipediadarkmode from '../../assets/images/wikipedia-darkmode.svg';
import { useContext, useState } from 'react';
import WikipediaInput from './WikiPedia/WikipediaInput';
import WebInput from './Web/WebInput';
import YoutubeInput from './Youtube/YoutubeInput';
import { APP_SOURCES } from '../../utils/Constants';
import Neo4jDataImportFromCloud from '../../assets/images/data-from-cloud.svg';
import { ThemeWrapperContext } from '../../context/ThemeWrapper';

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
  const themeUtils = useContext(ThemeWrapperContext);
  const [activeTab, setActiveTab] = useState<number>(isOnlyYoutube ? 0 : isOnlyWikipedia ? 1 : isOnlyWeb ? 2 : 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        setIsLoading(false);
        closeHandler();
      }}
    >
      <Dialog.Header>
        <div className='flex! flex-row pb-6 items-center mb-2'>
          <img src={Neo4jDataImportFromCloud} style={{ width: 95, height: 95, marginRight: 10 }} loading='lazy' />
          <div className='flex flex-col'>
            <Typography variant='h2'>Web Sources</Typography>
            <Typography variant='body-medium' className='mb-2'>
              Convert Any Web Source to Knowledge graph
            </Typography>
          </div>
        </div>
        <Tabs fill='underline' onChange={setActiveTab} size='large' value={activeTab}>
          {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && (
            <Tabs.Tab
              tabId={0}
              isDisabled={isLoading}
              htmlAttributes={{
                'aria-label': 'Database',
              }}
            >
              <img
                src={themeUtils.colorMode === 'light' ? youtubelightmodelogo : youtubedarkmodelogo}
                className={`brandimg`}
              ></img>
            </Tabs.Tab>
          )}
          {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && (
            <Tabs.Tab
              tabId={1}
              isDisabled={isLoading}
              htmlAttributes={{
                'aria-label': 'Add database',
              }}
            >
              <img
                src={themeUtils.colorMode === 'dark' ? wikipedialogo : wikipediadarkmode}
                className={`brandimg`}
              ></img>
            </Tabs.Tab>
          )}
          {APP_SOURCES != undefined && APP_SOURCES.includes('web') && (
            <Tabs.Tab
              tabId={2}
              isDisabled={isLoading}
              htmlAttributes={{
                'aria-label': 'Inbox',
              }}
            >
              <img src={themeUtils.colorMode === 'dark' ? webdarkmode : weblogo} className={`brandimg`}></img>
            </Tabs.Tab>
          )}
        </Tabs>
        {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={0}>
            <YoutubeInput loading={isLoading} setIsLoading={setIsLoading} />
          </Tabs.TabPanel>
        )}
        {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={1}>
            <WikipediaInput loading={isLoading} setIsLoading={setIsLoading} />
          </Tabs.TabPanel>
        )}
        {APP_SOURCES != undefined && APP_SOURCES.includes('web') && (
          <Tabs.TabPanel className='n-flex n-flex-col n-gap-token-4 n-p-token-6' value={activeTab} tabId={2}>
            <WebInput loading={isLoading} setIsLoading={setIsLoading} />
          </Tabs.TabPanel>
        )}
      </Dialog.Header>
    </Dialog>
  );
}
