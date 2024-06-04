import { Box, Checkbox, Flex, Typography } from '@neo4j-ndl/react';
import { DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import { CustomFile } from '../types';
import { List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { FC } from 'react';
import { timeperpage } from '../utils/Constants';
import BellImage from '../assets/images/Stopwatch-blue.svg';
import AlertIcon from './Layout/AlertIcon';
interface LargefilesProps {
  largeFiles: CustomFile[];
  handleToggle: (ischecked: boolean, id: string) => void;
  checked: string[];
}

const LargeFilesAlert: FC<LargefilesProps> = ({ largeFiles, handleToggle, checked }) => {
  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <img style={{ width: 95, height: 95, marginRight: 10 }} src={BellImage} alt='alert icon' />
        <Box className='flex flex-col'>
          <Typography variant='h2'>Large Document Notice</Typography>
          <Typography variant='body-medium' sx={{ mb: 2 }}>
            One or more of your selected documents are large and may take extra time to process. Please review the
            estimated times below
          </Typography>
          <List>
            {largeFiles.map((f, i) => {
              const minutes = Math.floor((timeperpage * f.total_pages) / 60);
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
                      <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Flex flexDirection='row'>
                          <span>
                            {f.name} - {Math.floor((f?.size as number) / 1000)?.toFixed(2)}KB -
                            {minutes === 0 ? `${timeperpage * f?.total_pages} Sec` : `${minutes} Min`}
                          </span>
                          <span>
                            <AlertIcon />
                          </span>
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
