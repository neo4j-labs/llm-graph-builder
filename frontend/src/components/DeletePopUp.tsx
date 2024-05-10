import { Button, Checkbox, Dialog, Typography } from '@neo4j-ndl/react';
import { useState } from 'react';

export default function DeletePopUp({
  open,
  no_of_files,
  deleteHandler,
  deleteCloseHandler,
  loading,
}: {
  open: boolean;
  no_of_files: number;
  deleteHandler: (delentities: boolean) => void;
  deleteCloseHandler: () => void;
  loading: boolean;
}) {
  const [deleteEntities, setDeleteEntities] = useState<boolean>(true);
  return (
    <Dialog onClose={deleteCloseHandler} open={open}>
      <Dialog.Content>
        <Typography variant='subheading-large'>
          This Action Will Delete {no_of_files} {no_of_files > 1 ? 'Files' : 'File'}{' '}
          {deleteEntities ? 'and associated entities' : ''}
        </Typography>
        <div className='mt-1'>
          <Checkbox
            label='Delete Entities'
            onClick={function Ua() {}}
            checked={deleteEntities}
            onChange={(e) => {
              if (e.target.checked) {
                setDeleteEntities(true);
              } else {
                setDeleteEntities(false);
              }
            }}
          />
        </div>
      </Dialog.Content>
      <Dialog.Actions className='mt-3'>
        <Button color='neutral' fill='outlined' onClick={deleteCloseHandler} size='large'>
          Cancel
        </Button>
        <Button onClick={() => deleteHandler(deleteEntities)} size='large' loading={loading}>
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
