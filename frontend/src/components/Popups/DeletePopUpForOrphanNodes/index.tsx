import { List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Box, Checkbox, Dialog, Flex, Typography } from '@neo4j-ndl/react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { UserCredentials, orphanNodeProps } from '../../../types';
import { getOrphanNodes } from '../../../services/GetOrphanNodes';
import { useCredentials } from '../../../context/UserCredentials';
import Loader from '../../../utils/Loader';
import Legend from '../../UI/Legend';
import { calcWordColor } from '@neo4j-devtools/word-color';
import { DocumentIconOutline } from '@neo4j-ndl/react/icons';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
import { ThemeWrapperContext } from '../../../context/ThemeWrapper';

export default function DeletePopUpForOrphanNodes({
  open,
  deleteHandler,
  deleteCloseHandler,
  loading,
}: {
  open: boolean;
  deleteHandler: (selectedEntities: string[]) => Promise<void>;
  deleteCloseHandler: () => void;
  loading: boolean;
}) {
  const [orphanNodes, setOrphanNodes] = useState<orphanNodeProps[]>([]);
  const [selectedOrphanNodesForDeletion, setselectedOrphanNodesForDeletion] = useState<string[]>([]);
  const [selectedAll, setselectedAll] = useState<boolean>(false);
  const [totalOrphanNodes, setTotalOrphanNodes] = useState<number>(0);
  const [isLoading, setLoading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const themeUtils = useContext(ThemeWrapperContext);

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          setLoading(true);
          const apiresponse = await getOrphanNodes(userCredentials as UserCredentials);
          setLoading(false);
          if (apiresponse.data.data.length) {
            setOrphanNodes(apiresponse.data.data);
            setTotalOrphanNodes(
              apiresponse.data.message != undefined && typeof apiresponse.data.message != 'string'
                ? apiresponse.data.message.total
                : 0
            );
          }
        } catch (error) {
          setLoading(false);
          console.log(error);
        }
      })();
    }
  }, [userCredentials, open]);

  const onChangeHandler = useCallback((isChecked: boolean, id: string) => {
    if (isChecked) {
      setselectedOrphanNodesForDeletion((prev) => [...prev, id]);
      setOrphanNodes((prev) => prev.map((n) => ({ ...n, checked: n.e.elementId === id ? true : n.checked })));
    } else {
      setselectedAll(false);
      setselectedOrphanNodesForDeletion((prev) => prev.filter((s) => s != id));
      setOrphanNodes((prev) => prev.map((n) => ({ ...n, checked: n.e.elementId === id ? false : n.checked })));
    }
  }, []);

  return (
    <Dialog
      size='large'
      open={open}
      onClose={() => {
        deleteCloseHandler();
        setselectedOrphanNodesForDeletion([]);
        setOrphanNodes([]);
        setselectedAll(false);
      }}
    >
      <Dialog.Header>
        <Flex flexDirection='column'>
          <Typography variant='subheading-large'>Orphan Nodes Deletion</Typography>
          <Flex justifyContent='space-between' flexDirection='row'>
            <Typography variant='subheading-small'>100 nodes per batch</Typography>
            {totalOrphanNodes > 0 ? (
              <Typography variant='subheading-small'>Total Nodes: {totalOrphanNodes}</Typography>
            ) : (
              <></>
            )}
          </Flex>
        </Flex>
      </Dialog.Header>
      <Dialog.Content>
        {orphanNodes.length ? (
          <Checkbox
            label='Select All Nodes'
            className='ml-4'
            checked={selectedAll}
            onChange={(e) => {
              if (e.target.checked) {
                setselectedAll(true);
                setOrphanNodes((prev) => prev.map((n) => ({ ...n, checked: true })));
                setselectedOrphanNodesForDeletion(orphanNodes.map((n) => n.e.elementId));
              } else {
                setselectedAll(false);
                setOrphanNodes((prev) => prev.map((n) => ({ ...n, checked: false })));
                setselectedOrphanNodesForDeletion([]);
              }
            }}
          ></Checkbox>
        ) : (
          <></>
        )}
        <List className='max-h-80 overflow-y-auto'>
          {orphanNodes.length > 0 ? (
            orphanNodes.map((n, i) => {
              return (
                <ListItem key={i} disablePadding>
                  <ListItemButton role={undefined} dense>
                    <ListItemIcon>
                      <Checkbox
                        aria-label='selection checkbox'
                        checked={n.checked}
                        onChange={(e) => onChangeHandler(e.target.checked, n.e.elementId)}
                        tabIndex={-1}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Flex flexDirection='row' justifyContent='space-between'>
                          <Typography variant='subheading-small'>{n.e.id}</Typography>
                          <Typography variant='subheading-small'>Connected Chunks: {n.chunkConnections}</Typography>
                        </Flex>
                      }
                      secondary={
                        <Flex flexDirection='column'>
                          <Box className='row'>
                            <span className='word-break'>Labels :</span>
                            <Flex>
                              {n.e.labels.map((l, index) => (
                                <Legend key={index} title={l} bgColor={calcWordColor(l)}></Legend>
                              ))}
                            </Flex>
                          </Box>
                          <Box className={themeUtils.colorMode === 'dark' ? 'row ndl-theme-dark' : 'row'}>
                            <span className='word-break'>Related Documents :</span>
                            <Flex>
                              {Array.from(new Set([...n.documents])).map((d, index) => (
                                <Flex key={`d${index}`} flexDirection='row'>
                                  <span>
                                    <DocumentIconOutline className='n-size-token-7' />
                                  </span>
                                  <span>{d}</span>
                                </Flex>
                              ))}
                            </Flex>
                          </Box>
                        </Flex>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          ) : isLoading ? (
            <Loader title='Loading...' />
          ) : (
            <>No Nodes Found</>
          )}
        </List>
      </Dialog.Content>
      <Dialog.Actions className='mt-3'>
        <ButtonWithToolTip
          onClick={() => {
            deleteHandler(selectedOrphanNodesForDeletion).then(() => {
              selectedOrphanNodesForDeletion.forEach((eid: string) => {
                setOrphanNodes((prev) => prev.filter((node) => node.e.elementId != eid));
              });
              setOrphanNodes((prev) => prev.map((n) => ({ ...n, checked: false })));
              setTotalOrphanNodes((prev) => {
                return prev - selectedOrphanNodesForDeletion.length;
              });
              setselectedOrphanNodesForDeletion([]);
            });
          }}
          size='large'
          loading={loading}
          text={
            isLoading
              ? 'Fetching Orphan Nodes'
              : !isLoading && !orphanNodes.length
              ? 'No Nodes Found'
              : !selectedOrphanNodesForDeletion.length
              ? 'No Nodes Selected'
              : `Delete Selected Nodes (${selectedOrphanNodesForDeletion.length})`
          }
          label='Orphan Node deletion button'
          disabled={!selectedOrphanNodesForDeletion.length}
        >
          Continue
        </ButtonWithToolTip>
      </Dialog.Actions>
    </Dialog>
  );
}
