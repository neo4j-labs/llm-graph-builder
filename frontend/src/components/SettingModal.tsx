import { Button, Dialog, Dropdown } from '@neo4j-ndl/react';
import { OnChangeValue } from 'react-select';
import { OptionType, UserCredentials } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { getNodeLabelsAndRelTypes } from '../services/GetNodeLabelsRelTypes';
import { useCredentials } from '../context/UserCredentials';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels } = useFileContext();
  const { userCredentials } = useCredentials();
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>) => setSelectedNodes(selectedOptions);
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>) => setSelectedRels(selectedOptions);
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);

  useEffect(() => {
    if (userCredentials) {
      const getOptions = async () => {
        try {
          const response = await getNodeLabelsAndRelTypes(userCredentials as UserCredentials);
          const nodelabels = response.data.data[0].labels.slice(0, 20).map((l) => ({ value: l, label: l }));
          const reltypes = response.data.data[0].relationshipTypes.slice(0, 20).map((t) => ({ value: t, label: t }));
          setnodeLabelOptions(nodelabels);
          setrelationshipTypeOptions(reltypes);
        } catch (error) {
          console.log(error);
        }
      };
      getOptions();
    }
  }, [userCredentials]);

  const clickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setSelectedNodes(nodeLabelOptions);
    setSelectedRels(relationshipTypeOptions);
  }, [nodeLabelOptions, relationshipTypeOptions]);

  return (
    <Dialog size='medium' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
      <Dialog.Header id='form-dialog-title'>Graph Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <Dropdown
          helpText='You can select more than one values'
          label='Node Labels'
          selectProps={{
            isClearable: true,
            isMulti: true,
            options: nodeLabelOptions,
            onChange: onChangenodes,
            value: selectedNodes,
          }}
          type='creatable'
        />
        <Dropdown
          helpText='You can select more than one values'
          label='Relationship Types'
          selectProps={{
            isClearable: true,
            isMulti: true,
            options: relationshipTypeOptions,
            onChange: onChangerels,
            value: selectedRels,
          }}
          type='creatable'
        />
        <div>
          <Button onClick={clickHandler}>Use Existing Schema</Button>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
