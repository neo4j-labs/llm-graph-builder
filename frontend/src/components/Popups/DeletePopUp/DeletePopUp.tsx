import { Button, Checkbox, Dialog } from '@neo4j-ndl/react';
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
    <Dialog open={open} onClose={deleteCloseHandler}>
      <Dialog.Content>
        <h5 className='max-w-[90%]'>
          Are you sure you want to permanently delete {no_of_files} {no_of_files > 1 ? 'Files' : 'File'}{' '}
          {deleteEntities ? 'and associated entities' : ''} from the graph database ?
        </h5>
        <div className='mt-1'>
          <Checkbox
            label='Delete Entities'
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
        <Button fill='outlined' size='large' onClick={deleteCloseHandler}>
          Cancel
        </Button>
        <Button onClick={() => deleteHandler(deleteEntities)} size='large' loading={loading}>
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
