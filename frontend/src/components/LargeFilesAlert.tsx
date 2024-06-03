import { Avatar, Box, Checkbox, Typography } from '@neo4j-ndl/react';
import { BellAlertIconOutline, DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import { CustomFile } from '../types';
import { List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { FC } from 'react';
interface LargefilesProps {
  largeFiles: CustomFile[];
  handleToggle: (id: string) => void;
  checked: string[];
}
const LargeFilesAlert: FC<LargefilesProps> = ({ largeFiles, handleToggle, checked }) => {
  return (
    <Box className='n-bg-palette-neutral-bg-weak p-4'>
      <Box className='flex flex-row pb-6 items-center mb-2'>
        <BellAlertIconOutline className='n-size-token-8' />
        <Box className='flex flex-col'>
          <Typography variant='h2'>Large Document Notice</Typography>
          <Typography variant='body-medium' sx={{ mb: 2 }}>
            One or more of your selected documents are large and may take extra time to process. Please review the
            estimated times below
          </Typography>
          <List>
            {largeFiles.map((f, i) => {
              return (
                <ListItem
                  key={i}
                  secondaryAction={
                    //@ts-ignore
                    f?.size > 1000000 ? <BellAlertIconOutline /> : <></>
                  }
                  disablePadding
                >
                  <ListItemButton
                    role={undefined}
                    onClick={() => {
                      handleToggle(f.id);
                    }}
                    dense
                  >
                    <ListItemIcon>
                      <Checkbox checked={checked.indexOf(f.id) !== -1} tabIndex={-1} />
                    </ListItemIcon>
                    <ListItemAvatar>
                      <Avatar>
                        <DocumentTextIconOutline />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={`${f.name}`} />
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
