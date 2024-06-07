import { Button, Dialog, Textarea } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { getNodeLabelsAndRelTypesFromText } from '../services/SchemaFromTextAPI';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { UserCredentials } from '../types';

const SchemaFromTextDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [userText, setUserText] = useState<string>('');
  const [loading, setloading] = useState<boolean>(false);
  const { userCredentials } = useCredentials();
  const { model } = useFileContext();
  const clickHandler = useCallback(async () => {
    try {
      setloading(true);
      const response = await getNodeLabelsAndRelTypesFromText(userCredentials as UserCredentials, model, userText);
      setloading(false);
      console.log({ response });
    } catch (error) {
      setloading(false);
      console.log(error);
    }
  }, []);

  return (
    <Dialog size='medium' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
      <Dialog.Header id='form-dialog-title'>Graph Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <Textarea
          helpText='Try pulling in the corner'
          label='Resizable'
          style={{
            resize: 'both',
          }}
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
        />
        <Dialog.Actions className='!mt-4'>
          <Button loading={loading} disabled={userText.trim() === '' || loading} onClick={clickHandler}>
            Analyze
          </Button>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};
export default SchemaFromTextDialog;
