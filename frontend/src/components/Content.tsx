import { useEffect, useState } from 'react';
import ConnectionModal from './ConnectionModal';
import LlmDropdown from './Dropdown';
import FileTable from './FileTable';
import { Button, Label, Typography, Flex } from '@neo4j-ndl/react';
import { setDriver, disconnect } from '../utils/Driver';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import CustomAlert from './Alert';
import { extractAPI } from '../utils/FileAPI';
import { ContentProps } from '../types';
import { updateGraphAPI } from '../services/UpdateGraphAPI';
const Content: React.FC<ContentProps> = ({ isExpanded, showChatBot, openChatBot }) => {
  const [init, setInit] = useState<boolean>(false);
  const [openConnection, setOpenConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const { setUserCredentials, userCredentials } = useCredentials();
  const { filesData, files, setFilesData } = useFileContext();
  const [selectedOption, setSelectedOption] = useState<string>('Diffbot');

  useEffect(() => {
    if (!init) {
      let session = localStorage.getItem('neo4j.connection');
      if (session) {
        let neo4jConnection = JSON.parse(session);
        setUserCredentials({
          uri: neo4jConnection.uri,
          userName: neo4jConnection.user,
          password: neo4jConnection.password,
        });
        setDriver(neo4jConnection.uri, neo4jConnection.user, neo4jConnection.password).then((isSuccessful: boolean) => {
          setConnectionStatus(isSuccessful);
        });
      }
      setInit(true);
    }
  }, []);

  const handleDropdownChange = (option: any) => {
    setSelectedOption(option.value);
  };

  const extractData = async (file: File, uid: number) => {
    if (filesData[uid]?.status == 'New') {
      try {
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Processing',
              };
            } else {
              return curfile;
            }
          })
        );
        const apiResponse = await extractAPI(
          file,
          filesData[uid].model,
          userCredentials,
          filesData[uid].source_url,
          localStorage.getItem('accesskey'),
          localStorage.getItem('secretkey'),
          filesData[uid].max_sources,
          filesData[uid].wiki_query ?? ''
        );
        return {...apiResponse,uid};
      } catch (err: any) {
        console.log(err);
        setFilesData((prevfiles) =>
          prevfiles.map((curfile, idx) => {
            if (idx == uid) {
              return {
                ...curfile,
                status: 'Failed',
              };
            } else {
              return curfile;
            }
          })
        );
      }
    }
  };

  const handleGenerateGraph = async () => {
<<<<<<< Updated upstream
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (filesData[i].status === 'New') {
          extractFile(files[i], i);
=======
    const extractApi = [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (filesData[i]?.status === 'New') {
          extractApi.push(extractData(files[i], i));
>>>>>>> Stashed changes
        }
      }
      const results = await Promise.allSettled(extractApi);
      results.forEach(async (apiRes) => {
        console.log(apiRes);
        if (apiRes.status === 'fulfilled' && apiRes.value) {
          if (apiRes?.value?.status === 'Failed') {
            console.log('Error', apiRes?.value);
            setShowAlert(true);
            setErrorMessage(apiRes?.value?.message);
            setFilesData((prevfiles) =>
              prevfiles.map((curfile,idx) => {
                if (idx == apiRes.value.uid) {
                  return {
                    ...curfile,
                    status: 'Failed',
                  };
                }
                return curfile;
              })
            );
            throw new Error(apiRes?.value?.message);
          } else {
            setFilesData((prevfiles) => {
              return prevfiles.map((curfile) => {
                if (curfile.name == apiRes.value.data.fileName) {
                  const apiResponse = apiRes?.value?.data;
                  return {
                    ...curfile,
                    processing: apiResponse?.processingTime?.toFixed(2),
                    status: apiResponse?.status,
                    NodesCount: apiResponse?.nodeCount,
                    relationshipCount: apiResponse?.relationshipCount,
                    model: apiResponse?.model,
                  };
                }
                return curfile;
              });
            });
          }
        }
      });
      const updateResponse = await updateGraphAPI(userCredentials);
      console.log('response', updateResponse);
    }
  };
  return (
    <div
      className='n-bg-palette-neutral-bg-default'
      style={{        
        width: '100%',
        height: 'calc(100dvh - 67px)',
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Flex className='w-full' alignItems='center' justifyContent='space-between' style={{ flexFlow: 'row' }}>
        <ConnectionModal
          open={openConnection}
          setOpenConnection={setOpenConnection}
          setConnectionStatus={setConnectionStatus}
        />
        <Typography variant='body-medium' style={{ display: 'flex', padding: '20px' }}>
          Neo4j connection Status:
          <Typography variant='body-medium' style={{ marginLeft: '10px' }}>
            {!connectionStatus ? <Label color='danger'>Not connected</Label> : <Label color='success'>Connected</Label>}
          </Typography>
        </Typography>
        {!connectionStatus ? (
          <Button className='mr-2.5' onClick={() => setOpenConnection(true)}>
            Connect to Neo4j
          </Button>
        ) : (
          <Button className='mr-2.5' onClick={() => disconnect().then(() => setConnectionStatus(false))}>
            Disconnect
          </Button>
        )}
      </Flex>
      <FileTable></FileTable>
      <Flex className='w-half' justifyContent='space-between' style={{ flexFlow: 'row', marginTop: '5px' }}>
        <LlmDropdown onSelect={handleDropdownChange} />
        <Button
          disabled={!files.length && filesData.some((item) => item.status == 'New')}
          onClick={handleGenerateGraph}
        >
          Generate Graph
        </Button>
      </Flex>
    </div>
  );
}
