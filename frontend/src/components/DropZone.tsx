import { Dropzone, Box } from '@neo4j-ndl/react';
import { useState } from 'react';
import FileTable from './FileTable';
import axios from 'axios';

export default function DropZone() {
  const [files, setFiles] = useState<Partial<globalThis.File>[] | []>([]);

  const fileUpload = async (file: any) => {
    const url = 'https://animated-space-broccoli-jpgjg6pg59qcp7pg-8000.app.github.dev';
    try {
      const formData = new FormData();
      formData.append("file",file)
      const response = await axios.post( `${url}/predict`,formData,{
        headers:{
          "Content-Type":"multipart/form-data"
        }
      });
      console.log(response);
      setFiles((files) => [...files, file]);
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
          dropZoneOptions={{
            accept: { 'application/pdf': ['.pdf'] },
            onDrop: (f: Partial<globalThis.File>[]) => {
              if (f.length) {
                console.log(f)
                // setFiles((files) => [...files, ...f]);
                fileUpload(f[0]);
              }
            },
          }}
        />
      </Box>
      <div style={{ marginTop: '15px', width: '100%' }}>{files.length > 0 && <FileTable files={files} />}</div>
    </>
  );
}
