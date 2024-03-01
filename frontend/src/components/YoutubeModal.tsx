import { Checkbox, TextInput } from '@neo4j-ndl/react';
import { useState } from 'react';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { urlScanAPI } from '../services/URLScan';
import { getSourceNodes } from '../services/getFiles';
import { S3ModalProps, SourceNode } from '../types';
import { getFileFromLocal } from '../utils/utils';
import { v4 as uuidv4 } from 'uuid';
import CustomModal from '../HOC/CustomModal';

const YoutubeModal: React.FC<S3ModalProps> = ({ hideModal, open }) => {
  const [youtubeURL, setYoutubeURL] = useState<string>('');
  const [sourceLimit, setSourceLimit] = useState<number>(5);
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [showSourceLimitInput, setshowSourceLimitInput] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [querySource, setQuerySource] = useState<string>('');

  const { userCredentials } = useCredentials();
  const { setFiles, setFilesData } = useFileContext();
  const reset = () => {
    setYoutubeURL('');
    setQuerySource('');
  };
  const submitHandler = async () => {
    if (!youtubeURL) {
      setStatus('danger');
      setStatusMessage('Please Fill the Valid YouTube link');
      setTimeout(() => {
        setStatus('unknown');
      }, 2000);
    } else {
      try {
        setStatus('info');
        setStatusMessage('Scaning...');
        const apiResponse = await urlScanAPI(youtubeURL, userCredentials, '', '', sourceLimit, querySource);
        console.log('response', apiResponse);
        setStatus('success');
        if (apiResponse.data.status == 'Failed') {
          setStatus('danger');
          setStatusMessage(apiResponse.data.message);
        } else {
          setStatusMessage(`Successfully Created Source Nodes for ${apiResponse.data.success_count} Files`);
        }
        setYoutubeURL('');
        const res: any = await getSourceNodes();
        if (Array.isArray(res.data.data) && res.data.data.length) {
          const prefiles = res.data.data.map((item: SourceNode) => ({
            name: item.fileName,
            size: item.fileSize ?? 0,
            type: item?.fileType?.toUpperCase() ?? 'None',
            NodesCount: item?.nodeCount ?? 0,
            processing: item?.processingTime ?? 'None',
            relationshipCount: item?.relationshipCount ?? 0,
            status:
              item.fileSource == 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId
                ? item.status
                : getFileFromLocal(`${item.fileName}`) != null
                ? item.status
                : 'N/A',
            model: item?.model ?? 'Diffbot',
            id: uuidv4(),
            s3url: item.s3url ?? '',
            fileSource: item.fileSource ?? 'None',
          }));
          setFilesData(prefiles);
          const prefetchedFiles: any[] = [];
          res.data.data.forEach((item: any) => {
            const localFile = getFileFromLocal(`${item.fileName}`);
            if (localFile != null) {
              prefetchedFiles.push(localFile);
            } else {
              prefetchedFiles.push(null);
            }
          });
          setFiles(prefetchedFiles);
        }
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred');
      }
    }
    setStatus('unknown');
  };
  const onClose = () => {
    hideModal();
    reset();
    setStatus('unknown');
    setshowSourceLimitInput(false);
  };
  return (
    <CustomModal
      open={open}
      onClose={onClose}
      statusMessage={statusMessage}
      setStatus={setStatus}
      submitHandler={submitHandler}
      status={status}
      submitLabel='Submit'
    >
      <div style={{ width: '100%', marginRight: '2.5%', display: 'inline-block' }}>
        <TextInput
          id='url'
          value={youtubeURL}
          disabled={false}
          label='Youtube Link'
          placeholder='https://youtu.be/qf7C1SATc7Y'
          autoFocus
          fluid
          required
          onChange={(e) => {
            setYoutubeURL(e.target.value);
          }}
        />
        <TextInput
          id='Query Source'
          className='my-3'
          value={querySource}
          disabled={false}
          label='Include Wikipedia Query Sources'
          placeholder=''
          fluid
          onChange={(e) => {
            setQuerySource(e.target.value);
          }}
        />
        {showSourceLimitInput && (
          <TextInput
            id='url'
            value={sourceLimit}
            disabled={false}
            label='Max Source Limit'
            placeholder='5'
            autoFocus
            fluid
            required
            type='number'
            onChange={(e) => {
              setSourceLimit(parseInt(e.target.value));
            }}
          />
        )}
        <div className='my-2'>
          <Checkbox
            label='Include Wikipedia Sources in the Knowledge Graph'
            onChange={(e) => {
              if (e.target.checked) {
                setshowSourceLimitInput(true);
              } else {
                setshowSourceLimitInput(false);
              }
            }}
          />
        </div>
      </div>
    </CustomModal>
  );
};
export default YoutubeModal;
