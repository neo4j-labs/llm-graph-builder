import { Dropzone, Box } from '@neo4j-ndl/react';
import { useState, useEffect } from 'react';
import FileTable from './FileTable';
import Loader from '../utils/Loader';
import { uploadAPI } from '../services/Upload';

interface CustomFile extends Partial<globalThis.File> {
  processing: string,
  status: string,
  NodesCount: number
}
export default function DropZone() {

  const [filesdata, setFilesdata] = useState<CustomFile[] | []>([]);
  const [files, setFiles] = useState<File[] | []>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const apiResponse = await uploadAPI(file);
      // console.log('api', apiResponse.data.processingTime);
      setFilesdata((prevfiles) => prevfiles.map((file) => ({ name: file.name, type: file.type, size: file.size, processing: JSON.parse(apiResponse?.data.processingTime), status: apiResponse?.statusText, NodesCount: JSON.parse(apiResponse?.data?.nodeCount) })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (files.length > 0) { fileUpload(files[files.length - 1]) }
  }, [files]);
  return (
    <>
      <Box
        borderRadius='xl'
        className=' n-border n-border-palette-primary-border-strong'
        style={{
          width: '100%',
        }}
      >
        <Dropzone
          loadingComponent={isLoading && <Loader />}
          isTesting={true}
          dropZoneOptions={{
            accept: { 'application/pdf': ['.pdf'] },
            onDrop: (f: Partial<globalThis.File>[]) => {
              setIsLoading(false)
              if (f.length) {
                const defaultValues: CustomFile = {
                  processing: "None",
                  status: "None",
                  NodesCount: 0,
                }
                const updatedFiles: CustomFile[] = f.map((file) => ({ name: file.name, type: file.type, size: file.size, ...defaultValues, }))
                setFiles((prevfiles) => [...prevfiles, ...(f as File[])]);
                setFilesdata((prevfilesdata) => [...prevfilesdata, ...updatedFiles]);
              }
            }
          }}
        />
      </Box>

      <div style={{ marginTop: '15px', width: '100%' }}>
        <div>
          {!isLoading && filesdata.length > 0 && <FileTable files={filesdata} />}
        </div>
      </div>
    </>
  );
}
