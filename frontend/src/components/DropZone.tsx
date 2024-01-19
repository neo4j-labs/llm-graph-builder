import { Dropzone, Box } from '@neo4j-ndl/react';
import { useState } from 'react';
import FileTable from './FileTable';
import axios from 'axios';

export default function DropZone() {
  const [files, setFiles] = useState<Partial<globalThis.File>[] | []>([]);

  const fileUpload = async (file: any) => {
    const url = 'http://127.0.0.1:8000/predict';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `${url}/upload_file`,

        formData
      );
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
          dropZoneOptions={{
            accept: { 'application/pdf': ['.pdf'] },
            onDrop: (f: Partial<globalThis.File>[]) => {
              if (f.length) {
                setFiles((files) => [...files, ...f]);
                fileUpload(files);
              }
            },
          }}
        />
      </Box>
      <div style={{ marginTop: '15px', width: '100%' }}>{files.length > 0 && <FileTable files={files} />}</div>
    </>
  );
}
