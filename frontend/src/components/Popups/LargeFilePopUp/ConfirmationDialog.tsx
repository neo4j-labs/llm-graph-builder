import { Button, Dialog, Typography } from '@neo4j-ndl/react';
import { CustomFile } from '../../../types';
import LargeFilesAlert from './LargeFilesAlert';
import { memo, useEffect, useState } from 'react';
import { useFileContext } from '../../../context/UsersFiles';
import ExpiredFilesAlert from '../ExpirationModal/ExpiredFilesAlert';
import { isExpired } from '../../../utils/Utils';

function ConfirmationDialog({
  largeFiles,
  open,
  onClose,
  loading,
  extractHandler,
  selectedRows,
  isLargeDocumentAlert = false,
}: {
  largeFiles: CustomFile[];
  open: boolean;
  onClose: () => void;
  loading: boolean;
  extractHandler: (selectedFilesFromAllfiles: CustomFile[]) => void;
  selectedRows: CustomFile[];
  isLargeDocumentAlert?: boolean;
}) {
  const { setSelectedRows, filesData, setRowSelection } = useFileContext();
  const [checked, setChecked] = useState<string[]>([...largeFiles.map((f) => f.id)]);
  const handleToggle = (isChecked: boolean, id: string) => {
    const newChecked = [...checked];
    if (isChecked) {
      const file = filesData.find((f) => f.id === id);
      newChecked.push(id);
      setSelectedRows((prev) => {
        const fileindex = prev.findIndex((f) => f === id);
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
        const filteredrows = prev.filter((f) => f != id);
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
      isOpen={open}
      onClose={() => {
        setChecked([]);
        onClose();
      }}
      htmlAttributes={{
        'aria-labelledby': 'form-dialog-title',
      }}
    >
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        {largeFiles.length === 0 && loading ? (
          <Typography variant='subheading-large'>Files are under processing</Typography>
        ) : isLargeDocumentAlert ? (
          <LargeFilesAlert handleToggle={handleToggle} Files={largeFiles} checked={checked}></LargeFilesAlert>
        ) : (
          <ExpiredFilesAlert checked={checked} handleToggle={handleToggle} Files={largeFiles} />
        )}
      </Dialog.Content>
      <Dialog.Actions className='mt-3!'>
        <Button
          onClick={() => {
            if (selectedRows.length) {
              extractHandler(selectedRows);
            } else {
              const tobeProcessFiles: CustomFile[] = [];
              for (let index = 0; index < checked.length; index++) {
                const id = checked[index];
                const file = filesData.find((f) => f.id === id);
                if (file) {
                  tobeProcessFiles.push(file);
                }
              }
              extractHandler(tobeProcessFiles);
            }
            setChecked([]);
            onClose();
          }}
          isDisabled={largeFiles.some(
            (f) => f.createdAt != undefined && checked.includes(f.id) && isExpired(f?.createdAt as Date)
          )}
        >
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
export default memo(ConfirmationDialog);
