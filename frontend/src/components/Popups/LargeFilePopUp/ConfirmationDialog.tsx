import { Button, Dialog, Typography } from '@neo4j-ndl/react';
import { CustomFile } from '../../../types';
import LargeFilesAlert from './LargeFilesAlert';
import { useEffect, useState } from 'react';
import { useFileContext } from '../../../context/UsersFiles';

export default function ConfirmationDialog({
  largeFiles,
  open,
  onClose,
  loading,
  extractHandler,
}: {
  largeFiles: CustomFile[];
  open: boolean;
  onClose: () => void;
  loading: boolean;
  extractHandler: (allowLargeFiles: boolean, selectedFilesFromAllfiles: CustomFile[]) => void;
}) {
  const { setSelectedRows, filesData, setRowSelection, selectedRows } = useFileContext();
  const [checked, setChecked] = useState<string[]>([...largeFiles.map((f) => f.id)]);
  const handleToggle = (ischecked: boolean, id: string) => {
    const newChecked = [...checked];
    if (ischecked) {
      const file = filesData.find((f) => f.id === id);
      newChecked.push(id);
      setSelectedRows((prev) => {
        const fileindex = prev.findIndex((f) => JSON.parse(f).id === id);
        if (fileindex == -1) {
          return [...prev, JSON.stringify(file)];
        }
        return prev;
      });
      setRowSelection((prev) => {
        const copiedobj = { ...prev };
        for (const key in copiedobj) {
          if (key == id) {
            copiedobj[key] = true;
          }
        }
        return copiedobj;
      });
    } else {
      const currentIndex = checked.findIndex((v) => v === id);
      newChecked.splice(currentIndex, 1);
      setRowSelection((prev) => {
        const copiedobj = { ...prev };
        for (const key in copiedobj) {
          if (key == id) {
            copiedobj[key] = false;
          }
        }
        return copiedobj;
      });
      setSelectedRows((prev) => {
        const filteredrows = prev.filter((f) => JSON.parse(f).id != id);
        return filteredrows;
      });
    }
    setChecked(newChecked);
  };
  useEffect(() => {
    if (!checked.length) {
      onClose();
    }
  }, [checked]);

  return (
    <Dialog
      size='medium'
      open={open}
      aria-labelledby='form-dialog-title'
      onClose={() => {
        setChecked([]);
        onClose();
        extractHandler(false, []);
      }}
    >
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        {largeFiles.length === 0 && loading ? (
          <Typography variant='subheading-large'>Files are under processing</Typography>
        ) : (
          <LargeFilesAlert handleToggle={handleToggle} largeFiles={largeFiles} checked={checked}></LargeFilesAlert>
        )}
      </Dialog.Content>
      <Dialog.Actions className='!mt-3'>
        <Button
          onClick={() => {
            if (selectedRows.length) {
              extractHandler(true, []);
            } else {
              const tobeProcessFiles: CustomFile[] = [];
              checked.forEach((id: string) => {
                const file = filesData.find((f) => f.id === id);
                if (file) {
                  tobeProcessFiles.push(file);
                }
              });
              extractHandler(true, tobeProcessFiles);
            }
            setChecked([]);
            onClose();
          }}
          size='large'
        >
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
