import { Button, Checkbox, Dialog } from '@neo4j-ndl/react';
import { memo, useState } from 'react';
function DeletePopUp({
  open,
  no_of_files,
  deleteHandler,
  deleteCloseHandler,
  loading,
  view,
}: {
  open: boolean;
  no_of_files: number;
  deleteHandler: (deleteEntities: boolean) => void;
  deleteCloseHandler: () => void;
  loading: boolean;
  view?: 'contentView' | 'settingsView';
}) {
  const [deleteEntities, setDeleteEntities] = useState<boolean>(true);
  const message =
    view === 'contentView'
      ? `Are you sure you want to permanently delete ${no_of_files} ${no_of_files > 1 ? 'Files' : 'File'} ${
          deleteEntities ? 'and associated entities' : ''
        } from the graph database?`
      : `Are you sure you want to permanently delete ${no_of_files} ${
          no_of_files > 1 ? 'Nodes' : 'Node'
        } from the graph database? `;
  return (
    <Dialog isOpen={open} onClose={deleteCloseHandler}>
      <Dialog.Content>
        <h5 className='max-w-[90%]'>{message}</h5>
        {view === 'contentView' && (
          <div className='mt-5'>
            <Checkbox
              label='Delete Entities'
              isChecked={deleteEntities}
              onChange={(e) => {
                if (e.target.checked) {
                  setDeleteEntities(true);
                } else {
                  setDeleteEntities(false);
                }
              }}
            />
          </div>
        )}
      </Dialog.Content>
      <Dialog.Actions className='mt-3'>
        <Button onClick={deleteCloseHandler} isDisabled={loading}>
          Cancel
        </Button>
        <Button onClick={() => deleteHandler(deleteEntities)} isLoading={loading}>
          Continue
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
export default memo(DeletePopUp);
