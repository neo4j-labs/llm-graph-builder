import { Button, Dialog, Textarea } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { getNodeLabelsAndRelTypesFromText } from '../services/SchemaFromTextAPI';
import { useCredentials } from '../context/UserCredentials';
import { useFileContext } from '../context/UsersFiles';
import { UserCredentials } from '../types';
import { AlertColor, AlertPropsColorOverrides } from '@mui/material';
import { OverridableStringUnion } from '@mui/types';

const SchemaFromTextDialog = ({
  open,
  onClose,
  openSettingsDialog,
  showAlert,
}: {
  open: boolean;
  onClose: () => void;
  openSettingsDialog: () => void;
  showAlert: (
    alertmsg: string,
    alerttype: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined
  ) => void;
}) => {
  const [userText, setUserText] = useState<string>('');
  const [loading, setloading] = useState<boolean>(false);
  const { setSelectedNodes, setSelectedRels } = useFileContext();
  const { userCredentials } = useCredentials();
  const { model } = useFileContext();

  const clickHandler = useCallback(async () => {
    try {
      setloading(true);
      const response = await getNodeLabelsAndRelTypesFromText(userCredentials as UserCredentials, model, userText);
      console.log({ response });
      setloading(false);
      if (response.data.status === 'Success') {
        if (response.data?.data?.labels.length) {
          const nodelabels = response.data?.data?.labels?.map((l) => ({ value: l, label: l }));
          setSelectedNodes((prev) => {
            const combinedData = [...prev, ...nodelabels];
            const uniqueLabels = new Set();
            const updatedOptions = combinedData.filter((item) => {
              if (!uniqueLabels.has(item.label)) {
                uniqueLabels.add(item.label);
                return true;
              }
              return false;
            });
            localStorage.setItem(
              'selectedNodeLabels',
              JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
            );
            return updatedOptions;
          });
        }
        if (response.data?.data?.relationshipTypes.length) {
          const reltypes = response.data?.data?.relationshipTypes.map((t) => ({ value: t, label: t }));
          setSelectedRels((prev) => {
            const combinedData = [...prev, ...reltypes];
            const uniqueLabels = new Set();
            const updatedOptions = combinedData.filter((item) => {
              if (!uniqueLabels.has(item.label)) {
                uniqueLabels.add(item.label);
                return true;
              }
              return false;
            });
            localStorage.setItem(
              'selectedRelationshipLabels',
              JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
            );
            return updatedOptions;
          });
        }
        if (response.data?.data?.relationshipTypes.length && response.data?.data?.labels.length) {
          showAlert(
            `Successfully Created ${response.data?.data?.labels.length} Node labels and ${response.data?.data?.relationshipTypes.length} Relationship labels`,
            'success'
          );
        } else if (response.data?.data?.relationshipTypes.length && !response.data?.data?.labels.length) {
          showAlert(
            `Successfully Created ${response.data?.data?.relationshipTypes.length} Relationship labels`,
            'success'
          );
        } else if (!response.data?.data?.relationshipTypes.length && response.data?.data?.labels.length) {
          showAlert(`Successfully Created ${response.data?.data?.labels.length} Node labels`, 'success');
        } else {
          showAlert(`Please give meaningfull text`, 'success');
        }
      } else {
        throw new Error('Unable to create labels from ');
      }
      onClose();
      setUserText('');
      openSettingsDialog();
    } catch (error) {
      setloading(false);
      console.log(error);
    }
  }, [userCredentials, userText]);

  return (
    <Dialog
      size='medium'
      open={open}
      aria-labelledby='form-dialog-title'
      onClose={() => {
        setloading(false);
        setUserText('');
        onClose();
      }}
    >
      <Dialog.Header id='form-dialog-title'>Graph Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <Textarea
          helpText='Analyze the text to extract Entities'
          label='Document Text'
          style={{
            resize: 'vertical',
          }}
          fluid
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          size='large'
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
