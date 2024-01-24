import { Dropzone, Box } from '@neo4j-ndl/react';
import { useState } from 'react';
import FileTable from './FileTable';
import axios from 'axios';
import { Button } from '@neo4j-ndl/react';
import Loader from '../utils/Loader';

interface CustomFile extends Partial<globalThis.File> {
  processing: string,
  status: string,
  NodesCount: number
}
export default function DropZone() {

  const [filesdata, setFilesdata] = useState<CustomFile[] | []>([]);
  const [files, setFiles] = useState<File[] | []>([]);
  const [isloading, setisLoading] = useState<boolean>(false);
  const fileUpload = async (file: File) => {
    // const url = 'https://animated-space-broccoli-jpgjg6pg59qcp7pg-8000.app.github.dev';
    const origin = window.location.origin.split("-");
    origin[origin.length - 1] = "8000";
    const finalurl = `${origin.join("-")}.app.github.dev`
    console.log(finalurl);
    try {
      const formData = new FormData();
      formData.append("file", file)
      const response = await axios.post(`${finalurl}/predict`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      console.log(response);
    } catch (error) {
      console.log(error);
    }
  };

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
          loadingComponent={isloading && <Loader />}
          isTesting={true}
          dropZoneOptions={{
            accept: { 'application/pdf': ['.pdf'] },
            onDrop: (f: Partial<globalThis.File>[]) => {
              setisLoading(false)
              if (f.length) {
                console.log(f)
                const defaultValues: CustomFile = {
                  processing: "None",
                  status: "None",
                  NodesCount: 0,
                }
                const updatedFiles: CustomFile[] = f.map((file) => ({ name: file.name, type: file.type, size: file.size, ...defaultValues, }))
                setFiles((prevfiles) => [...prevfiles, ...(f as File[])])
                setFilesdata((prevfilesdata) => [...prevfilesdata, ...updatedFiles]);

                // fileUpload(f[0]);
              }
            },
            onDragEnter: () => {
              setisLoading(true)
            }
          }}
        />
      </Box>

      <div style={{ marginTop: '15px', width: '100%' }}>
        <div>
          {filesdata.length > 0 && <FileTable files={filesdata} />}
          {filesdata.length > 0 && <Button onClick={() => fileUpload(files[0])}>Generate Graph</Button>}
        </div>
      </div>
    </>
  );
}
