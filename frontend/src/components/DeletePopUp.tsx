import { Button, Dialog } from '@neo4j-ndl/react';

export default function DeletePopUp({
    open,
    no_of_files,
    deleteHandler,
    deleteCloseHandler,
    loading,
}: {
    open: boolean;
    no_of_files: number;
    deleteHandler: () => void;
    deleteCloseHandler: () => void;
    loading: boolean;
}) {
    return (
        <Dialog
            modalProps={{
                className: 'w-full',
                id: 'default-menu',
            }}
            onClose={deleteCloseHandler}
            open={open}
        >
            <Dialog.Content>This Action Will Delete {no_of_files} {no_of_files > 1 ? 'Files' : 'File'}</Dialog.Content>
            <Dialog.Actions>
                <Button color='neutral' fill='outlined' onClick={deleteCloseHandler} size='large'>
                    Cancel
                </Button>
                <Button onClick={deleteHandler} size='large' loading={loading}>
                    Continue
                </Button>
            </Dialog.Actions>
        </Dialog>
    );
}
