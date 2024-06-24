import { useCallback, useState } from 'react';
import CustomModal from '../HOC/CustomModal';
import { TextInput } from '@neo4j-ndl/react';
import { CustomFile, CustomFileBase, UserCredentials, WikipediaModalTypes, fileName } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { v4 as uuidv4 } from 'uuid';
import { useCredentials } from '../context/UserCredentials';
import { urlScanAPI } from '../services/URLScan';
import { buttonCaptions } from '../utils/Constants';
import { wikiValidation } from '../utils/Utils';

const WikipediaModal: React.FC<WikipediaModalTypes> = ({ hideModal, open }) => {
  const [wikiQuery, setwikiQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const { setFilesData, model, filesData } = useFileContext();
  const { userCredentials } = useCredentials();
  const [isFocused, setisFocused] = useState<boolean>(false);
  const [isValid, setValid] = useState<boolean>(false);
  const onClose = useCallback(() => {
    hideModal();
    setwikiQuery('');
    setStatus('unknown');
    setValid(false);
    setisFocused(false);
  }, []);

  const submitHandler = async (url: string) => {
    const defaultValues: CustomFileBase = {
      processing: 0,
      status: 'New',
      NodesCount: 0,
      relationshipCount: 0,
      type: 'TEXT',
      model: model,
      fileSource: 'Wikipedia',
      processingProgress: undefined,
    };
    if (url.trim() != '') {
      setValid(wikiValidation(url) && isFocused);
    }
    if (isValid) {
      try {
        setStatus('info');
        setStatusMessage('Scanning...');
        const apiResponse = await urlScanAPI({
          userCredentials: userCredentials as UserCredentials,
          model: model,
          wikiquery: wikiQuery.trim(),
          source_type: 'Wikipedia',
        });
        setStatus('success');
        if (apiResponse?.data.status == 'Failed' || !apiResponse.data) {
          setStatus('danger');
          setStatusMessage(apiResponse?.data?.message);
          setTimeout(() => {
            setStatus('unknown');
            setwikiQuery('');
            setValid(false);
            setisFocused(false);
            hideModal();
          }, 5000);
          return;
        }

        const apiResCheck = apiResponse?.data?.success_count && apiResponse.data.failed_count;
        if (apiResCheck) {
          setStatus('info');
          setStatusMessage(
            `Successfully Created Source Node for ${apiResponse.data.success_count} and Failed for ${apiResponse.data.failed_count} Wikipedia Link`
          );
        } else if (apiResponse?.data?.success_count) {
          setStatusMessage(`Successfully Created Source Node for ${apiResponse.data.success_count} Wikipedia Link`);
        } else {
          setStatus('danger');
          setStatusMessage(`Failed to Create Source Node for ${apiResponse.data.failed_count} Wikipedia Link`);
        }

        const copiedFilesData: CustomFile[] = [...filesData];
        apiResponse?.data?.file_name?.forEach((item: fileName) => {
          const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
          if (filedataIndex == -1) {
            copiedFilesData.unshift({
              name: item.fileName,
              size: item.fileSize,
              wiki_query: item.fileName,
              source_url: item.url,
              id: uuidv4(),
              language: item.language,
              // total_pages: 1,
              ...defaultValues,
            });
          } else {
            const tempFileData = copiedFilesData[filedataIndex];
            copiedFilesData.splice(filedataIndex, 1);
            copiedFilesData.unshift({
              ...tempFileData,
              status: defaultValues.status,
              NodesCount: defaultValues.NodesCount,
              relationshipCount: defaultValues.relationshipCount,
              processing: defaultValues.processing,
              model: defaultValues.model,
              fileSource: defaultValues.fileSource,
              processingProgress: defaultValues.processingProgress,
            });
          }
        });
        setFilesData(copiedFilesData);
        setwikiQuery('');
        setValid(false);
        setisFocused(false);
      } catch (error) {
        setStatus('danger');
        setStatusMessage('Some Error Occurred or Please Check your Instance Connection');
      }
    } else {
      setStatus('danger');
      setStatusMessage('Please Fill the Wikipedia Link');
      setTimeout(() => {
        setStatus('unknown');
      }, 5000);
      return;
    }
    setTimeout(() => {
      setStatus('unknown');
      hideModal();
    }, 1000);
  };
  return (
    <CustomModal
      open={open}
      onClose={onClose}
      statusMessage={statusMessage}
      setStatus={setStatus}
      submitHandler={() => submitHandler(wikiQuery)}
      status={status}
      submitLabel={buttonCaptions.submit}
    >
      <div className='w-full inline-block'>
        <TextInput
          type='url'
          id='keyword'
          value={wikiQuery}
          disabled={false}
          label='Wikipedia Link'
          aria-label='Wikipedia Link'
          placeholder='https://en.wikipedia.org/wiki/Albert_Einstein'
          autoFocus
          fluid
          required
          onBlur={() => setValid(wikiValidation(wikiQuery) && isFocused)}
          errorText={!isValid && isFocused && 'Please Fill The Valid URL'}
          onChange={(e) => {
            setisFocused(true);
            if (e.target.value.includes('https://en.wikipedia.org/wiki/')) {
              setValid(wikiValidation(e.target.value));
            }
            setwikiQuery(e.target.value);
          }}
        />
      </div>
    </CustomModal>
  );
};
export default WikipediaModal;
