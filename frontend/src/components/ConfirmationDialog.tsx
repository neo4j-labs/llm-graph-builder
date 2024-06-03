import { Button, Dialog } from '@neo4j-ndl/react';
import { CustomFile } from '../types';
import LargeFilesAlert from './LargeFilesAlert';
import { useState } from 'react';

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
  extractHandler: (allowLargeFiles: boolean) => void;
}) {
  const [checked, setChecked] = useState<string[]>([...largeFiles.map((f) => f.id)]);
  const handleToggle = (ischecked: boolean, id: string) => {
    console.log({ ischecked, id });
    const newChecked = [...checked];
    if (ischecked) {
      newChecked.push(id);
    } else {
      const currentIndex = checked.findIndex((v) => v === id);
      console.log({ currentIndex });
      newChecked.splice(currentIndex, 1);
    }
    setChecked(newChecked);
  };
  return (
    <Dialog size='medium' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
      <Dialog.Header id='form-dialog-title'>Graph Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <LargeFilesAlert handleToggle={handleToggle} largeFiles={largeFiles} checked={checked}></LargeFilesAlert>
      </Dialog.Content>
      <Dialog.Actions className='mt-3'>
        <Button
          color='neutral'
          fill='outlined'
          onClick={function Ua() {
            extractHandler(false);
          }}
          size='large'
        >
          Cancel
        </Button>
        <Button onClick={() => extractHandler(true)} size='large' loading={loading}>
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
