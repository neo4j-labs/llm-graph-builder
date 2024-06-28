import { List, ListItem, ListItemAvatar, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Button, Checkbox, Dialog, Flex } from '@neo4j-ndl/react';
import { DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import { useEffect, useState } from 'react';
import { UserCredentials, orphanNodeProps } from '../../../types';
import { getOrphanNodes } from '../../../services/GetOrphanNodes';
import { useCredentials } from '../../../context/UserCredentials';

export default function DeletePopUpForOrphanNodes({
  open,
  deleteHandler,
  deleteCloseHandler,
  loading,
}: {
  open: boolean;
  deleteHandler: (selectedEntities: orphanNodeProps[]) => void;
  deleteCloseHandler: () => void;
  loading: boolean;
}) {
  const [orphanNodes, setOrphanNodes] = useState<orphanNodeProps[]>([]);
  const [selectedOrphanNodesForDeletion, setselectedOrphanNodesForDeletion] = useState<orphanNodeProps[]>([]);
  const { userCredentials } = useCredentials();

  useEffect(() => {
    (async () => {
      try {
        const apiresponse = await getOrphanNodes(userCredentials as UserCredentials);
        if (apiresponse.data.data.length) {
          setOrphanNodes(apiresponse.data.data);
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, [userCredentials]);

  return (
    <Dialog open={open} onClose={deleteCloseHandler}>
      <Dialog.Content>
        <List className='max-h-80 overflow-y-auto'>
          {orphanNodes.length > 0 ? (
            orphanNodes.map((n, i) => {
              return (
                <ListItem key={i} disablePadding>
                  <ListItemButton role={undefined} dense>
                    <ListItemIcon>
                      <Checkbox
                        aria-label='selection checkbox'
                        onChange={(e) => console.log(e.target.value)}
                        tabIndex={-1}
                      />
                    </ListItemIcon>
                    <ListItemAvatar>
                      <DocumentTextIconOutline className='n-size-token-7 mr-2' />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Flex flexDirection='row'>
                          <span className='word-break'>{n.e.id}</span>
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
        <Button onClick={() => deleteHandler(selectedOrphanNodesForDeletion)} size='large' loading={loading}>
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
