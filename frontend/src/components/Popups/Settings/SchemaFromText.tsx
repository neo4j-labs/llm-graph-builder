import { Checkbox, Dialog, TextArea } from '@neo4j-ndl/react';
import { useCallback, useState } from 'react';
import { getNodeLabelsAndRelTypesFromText } from '../../../services/SchemaFromTextAPI';
import { useCredentials } from '../../../context/UserCredentials';
import { useFileContext } from '../../../context/UsersFiles';
import { buttonCaptions } from '../../../utils/Constants';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
import { showNormalToast, showSuccessToast } from '../../../utils/Toasts';

const SchemaFromTextDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [userText, setUserText] = useState<string>('');
  const [loading, setIsLoading] = useState<boolean>(false);
  const { setSelectedNodes, setSelectedRels } = useFileContext();
  const { userCredentials } = useCredentials();
  const [isSchemaText, setIsSchemaText] = useState<boolean>(false);
  const { model } = useFileContext();

  const clickHandler = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getNodeLabelsAndRelTypesFromText(model, userText, isSchemaText);
      setIsLoading(false);
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
          showSuccessToast(
            `Successfully Created ${response.data?.data?.labels.length} Node labels and ${response.data?.data?.relationshipTypes.length} Relationship labels`
          );
        } else if (response.data?.data?.relationshipTypes.length && !response.data?.data?.labels.length) {
          showSuccessToast(`Successfully Created ${response.data?.data?.relationshipTypes.length} Relationship labels`);
        } else if (!response.data?.data?.relationshipTypes.length && response.data?.data?.labels.length) {
          showSuccessToast(`Successfully Created ${response.data?.data?.labels.length} Node labels`);
        } else {
          showNormalToast(`Please give meaningful text`);
        }
      } else {
        throw new Error('Unable to create labels from ');
      }
      onClose();
      setUserText('');
      setIsSchemaText(false);
    } catch (error) {
      setIsLoading(false);
      console.log(error);
    }
  }, [userCredentials, userText, isSchemaText]);

  return (
    <Dialog
      size='medium'
      isOpen={open}
      onClose={() => {
        setIsLoading(false);
        setIsSchemaText(false);
        setUserText('');
        onClose();
      }}
      htmlAttributes={{
        'aria-labelledby': 'form-dialog-title',
      }}
    >
      <Dialog.Header>Entity Graph Extraction Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <TextArea
          helpText='Analyze the text to extract Entities'
          label='Document Text'
          style={{
            resize: 'vertical',
          }}
          isFluid={true}
          value={userText}
          htmlAttributes={{
            onChange: (e) => setUserText(e.target.value),
          }}
          size='large'
        />
        <Dialog.Actions className='mt-4!'>
          <Checkbox
            label='Text is schema description'
            onChange={(e) => {
              setIsSchemaText(e.target.checked);
            }}
            isChecked={isSchemaText}
          />
          <ButtonWithToolTip
            placement='top'
            label='Analyze button'
            text={userText.trim() === '' ? 'please fill the text to extract graph schema' : 'Analyze text for schema'}
            loading={loading}
            disabled={userText.trim() === '' || loading}
            onClick={clickHandler}
          >
            {buttonCaptions.analyze}
          </ButtonWithToolTip>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};
export default SchemaFromTextDialog;
