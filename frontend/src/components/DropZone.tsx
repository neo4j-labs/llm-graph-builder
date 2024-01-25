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
      setFilesdata((prevfiles) => prevfiles.map((curfile) => {
        if (file.name == curfile.name) {
          return {
            ...curfile,
            status: "Processing"
          }
        } else {
          return curfile
        }
      }))
      const apiResponse = await uploadAPI(file);
      console.log('api', apiResponse.data);
      if (apiResponse.data != "Failure") {
        setFilesdata((prevfiles) => prevfiles.map((curfile) => {
          if (file.name == curfile.name) {
            return {
              ...curfile,
              processing: apiResponse?.data.processingTime,
              status: apiResponse?.data?.status,
              NodesCount: apiResponse?.data?.nodeCount
            }
          } else {
            return curfile
          }
        }));
        setIsLoading(false);
      } else {
        throw new Error("API Failure")
      }
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      setFilesdata((prevfiles) => prevfiles.map((curfile) => {
        if (file.name == curfile.name) {
          return {
            ...curfile,
            status: "Failed"
          }
        } else {
          return curfile
        }
      }))
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
          {filesdata.length > 0 && <FileTable files={filesdata} />}
        </div>
      </div>
    </>
  );
}
