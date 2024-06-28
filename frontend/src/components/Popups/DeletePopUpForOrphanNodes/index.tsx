import { List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Button, Checkbox, Dialog, Flex } from '@neo4j-ndl/react';
import { DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import { useState } from 'react';


export default function DeletePopUpForOrphanNodes({
  open,
  deleteHandler,
  deleteCloseHandler,
  handleToggle,
  checked,
  loading,
}: {
  open: boolean;
  deleteHandler: () => void;
  deleteCloseHandler: () => void;
  handleToggle: () => void;
  checked: string[];
  loading: boolean;
}) {
  const [orphanNodes, setorphanNodes] = useState([]);
  return (
    <Dialog open={open} onClose={deleteCloseHandler}>
      <Dialog.Content>
        <List className='max-h-80 overflow-y-auto'>
          {orphanNodes.length > 0 ? (
            orphanNodes.map((f, i) => {
              return (
                <ListItem key={i} disablePadding>
                  <ListItemButton role={undefined} dense>
                    <ListItemIcon>
                      <Checkbox
                        aria-label='selection checkbox'
                        onChange={(e) => console.log(e.target.value)}
                        // checked={checked.indexOf(f.id) !== -1}
                        tabIndex={-1}
                      />
                    </ListItemIcon>
                    <ListItemAvatar>
                      <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Flex flexDirection='row'>
                          <span className='word-break'></span>
                        </Flex>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          ) : (
            <>No Nodes found</>
          )}
        </List>
      </Dialog.Content>
      <Dialog.Actions className='mt-3'>
        <Button fill='outlined' size='large' onClick={deleteCloseHandler}>
          Cancel
        </Button>
        <Button onClick={() => deleteHandler()} size='large' loading={loading}>
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
