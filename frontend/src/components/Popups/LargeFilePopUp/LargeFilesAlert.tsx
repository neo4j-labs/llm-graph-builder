import { Box, Checkbox, Flex, Typography } from '@neo4j-ndl/react';
import { DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import { LargefilesProps } from '../../../types';
import { List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { FC, useContext, useMemo } from 'react';
import { chunkSize } from '../../../utils/Constants';
import BellImage from '../../../assets/images/Stopwatch-blue.svg';
import AlertIcon from '../../Layout/AlertIcon';
import wikipedialogo from '../../../assets/images/wikipedia.svg';
import youtubelogo from '../../../assets/images/youtube.svg';
import weblogo from '../../../assets/images/web.svg';
import webdarkmode from '../../../assets/images/web-darkmode.svg';
import gcslogo from '../../../assets/images/gcs.webp';
import s3logo from '../../../assets/images/s3logo.png';
import { calculateProcessingTime } from '../../../utils/Utils';
import { ThemeWrapperContext } from '../../../context/ThemeWrapper';

const LargeFilesAlert: FC<LargefilesProps> = ({ largeFiles, handleToggle, checked }) => {
  const { colorMode } = useContext(ThemeWrapperContext);

  const imageIcon: Record<string, string> = useMemo(
    () => ({
      Wikipedia: wikipedialogo,
      'gcs bucket': gcslogo,
      youtube: youtubelogo,
      's3 bucket': s3logo,
      'web-url': colorMode === 'light' ? weblogo : webdarkmode,
    }),
    [colorMode]
  );
  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <img
          style={{ width: 95, height: 95, marginRight: 10, alignSelf: 'flex-start' }}
          src={BellImage}
          alt='alert icon'
        />
        <Box className='flex flex-col'>
          <Typography variant='h3'>Large Document Notice</Typography>
          <Typography variant='body-medium' sx={{ mb: 2 }}>
            One or more of your selected documents are large and may take extra time to process. Please review the
            estimated times below
          </Typography>
          <List className='max-h-80 overflow-y-auto'>
            {largeFiles.map((f, i) => {
              const { minutes, seconds } = calculateProcessingTime(f.size as number, 0.2);
              return (
                <ListItem key={i} disablePadding>
                  <ListItemButton role={undefined} dense>
                    <ListItemIcon>
                      <Checkbox
                        aria-label='selection checkbox'
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleToggle(true, f.id);
                          } else {
                            handleToggle(false, f.id);
                          }
                        }}
                        checked={checked.indexOf(f.id) !== -1}
                        tabIndex={-1}
                      />
                    </ListItemIcon>
                    <ListItemAvatar>
                      {imageIcon[f.fileSource] ? (
                        <img width={20} height={20} src={imageIcon[f.fileSource]}></img>
                      ) : (
                        <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Flex flexDirection='row'>
                          <span className='word-break'>
                            {f.name} - {Math.floor((f?.size as number) / 1000)?.toFixed(2)}KB
                            {f.fileSource === 'local file' && minutes === 0 && typeof f.size === 'number'
                              ? `- ${seconds} Sec `
                              : f.fileSource === 'local file'
                              ? `- ${minutes} Min`
                              : ''}
                          </span>
                          {typeof f.size === 'number' && f.size > chunkSize ? (
                            <span>
                              <AlertIcon />
                            </span>
                          ) : (
                            <></>
                          )}
                        </Flex>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Box>
    </Box>
  );
};
export default LargeFilesAlert;