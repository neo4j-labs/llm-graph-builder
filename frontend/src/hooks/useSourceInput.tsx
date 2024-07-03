import React, { useCallback, useState } from 'react';
import { CustomFile, CustomFileBase, ScanProps, UserCredentials, fileName } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { useCredentials } from '../context/UserCredentials';
import { urlScanAPI } from '../services/URLScan';
import { v4 as uuidv4 } from 'uuid';

export default function useSourceInput(
  validator: (e: string) => boolean,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fileSource: string,
  isWikiQuery?: boolean,
  isYoutubeLink?: boolean,
  isWebLink?: boolean
) {
  const [inputVal, setInputVal] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [status, setStatus] = useState<'unknown' | 'success' | 'info' | 'warning' | 'danger'>('unknown');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { setFilesData, model, filesData } = useFileContext();
  const { userCredentials } = useCredentials();

  const onChangeHandler: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setIsFocused(true);
    if (e.target.value.length >= 10) {
      setIsValid(validator(e.target.value) && true);
    }
    setInputVal(e.target.value);
  }, []);
  const onBlurHandler: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setIsValid(validator(inputVal) && isFocused);
  }, [inputVal, isFocused]);

  const onPasteHandler: React.ClipboardEventHandler<HTMLInputElement> = useCallback(() => {
    setIsFocused(true);
    setIsValid(validator(inputVal) && true);
  }, [inputVal]);

  const onClose = useCallback(() => {
    setInputVal('');
    setStatus('unknown');
    setIsValid(false);
    setIsFocused(false);
  }, []);

  const submitHandler = useCallback(
    async (url: string) => {
      const defaultValues: CustomFileBase = {
        processing: 0,
        status: 'New',
        NodesCount: 0,
        relationshipCount: 0,
        type: 'TEXT',
        model: model,
        fileSource: fileSource,
        processingProgress: undefined,
      };
      if (url.trim() != '') {
        setIsValid(validator(url) && isFocused);
      }
      if (isValid) {
        try {
          setStatus('info');
          setIsLoading(true);
          setStatusMessage('Scanning...');
          const params: ScanProps = {
            userCredentials: userCredentials as UserCredentials,
            model: model,
            source_type: fileSource,
          };
          if (isWikiQuery) {
            params.wikiquery = url.trim();
          } else if (isYoutubeLink || isWebLink) {
            params.urlParam = url.trim();
          }
          const apiResponse = await urlScanAPI(params);
          setIsLoading(false);
          setStatus('success');
          if (apiResponse?.data.status == 'Failed' || !apiResponse.data) {
            setStatus('danger');
            setStatusMessage(apiResponse?.data?.message);
            setTimeout(() => {
              setStatus('unknown');
              setInputVal('');
              setIsValid(false);
              setIsFocused(false);
            }, 5000);
            return;
          }

          const apiResCheck = apiResponse?.data?.success_count && apiResponse.data.failed_count;
          if (apiResCheck) {
            setStatus('info');
            setStatusMessage(
              `Successfully Created Source Node for ${apiResponse.data.success_count} and Failed for ${apiResponse.data.failed_count} ${fileSource} Link`
            );
          } else if (apiResponse?.data?.success_count) {
            setStatusMessage(
              `Successfully Created Source Node for ${apiResponse.data.success_count} ${fileSource} Link`
            );
          } else {
            setStatus('danger');
            setStatusMessage(`Failed to Create Source Node for ${apiResponse.data.failed_count} ${fileSource} Link`);
          }

          const copiedFilesData: CustomFile[] = [...filesData];
          apiResponse?.data?.file_name?.forEach((item: fileName) => {
            const filedataIndex = copiedFilesData.findIndex((filedataitem) => filedataitem?.name === item?.fileName);
            if (filedataIndex == -1) {
              const baseValues = {
                name: item.fileName,
                size: item.fileSize,
                source_url: item.url,
                id: uuidv4(),
                language: item.language,
                // total_pages: 1,
                ...defaultValues,
              };
              if (isWikiQuery) {
                baseValues.wiki_query = item.fileName;
              }
              copiedFilesData.unshift(baseValues);
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
          setInputVal('');
          setIsValid(false);
          setIsFocused(false);
        } catch (error) {
          setStatus('danger');
          setStatusMessage('Some Error Occurred or Please Check your Instance Connection');
        }
      } else {
        setStatus('danger');
        setStatusMessage(`Please Fill the ${fileSource} Link`);
        setTimeout(() => {
          setStatus('unknown');
        }, 5000);
        return;
      }
      setTimeout(() => {
        setStatus('unknown');
      }, 3000);
    },

    [filesData, isWikiQuery, isYoutubeLink, isWebLink, isValid, fileSource, model]
  );

  return {
    inputVal,
    onChangeHandler,
    onBlurHandler,
    isValid,
    isFocused,
    status,
    setStatus,
    statusMessage,
    submitHandler,
    onClose,
    onPasteHandler,
  };
}
