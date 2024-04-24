import { Button, Checkbox, Dialog, Dropdown } from '@neo4j-ndl/react';
import { OnChangeValue } from 'react-select';
import { NODES_OPTIONS, RELATION_OPTIONS } from '../utils/Constants';
import { OptionType, UserCredentials } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { getNodeLabelsAndRelTypes } from '../services/GetNodeLabelsRelTypes';
import { useCredentials } from '../context/UserCredentials';
import { ChangeEventHandler, useCallback, useEffect, useState } from 'react';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels } = useFileContext();
  const { userCredentials } = useCredentials();
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>) => setSelectedNodes(selectedOptions);
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>) => setSelectedRels(selectedOptions);
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>(NODES_OPTIONS);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>(RELATION_OPTIONS);

  useEffect(() => {
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
  }, []);

  const clickHandler: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    if (e.target.checked) {
      setSelectedNodes(nodeLabelOptions);
      setSelectedRels(relationshipTypeOptions);
    } else {
      setSelectedNodes([]);
      setSelectedRels([]);
    }
  }, []);

  return (
    <Dialog size='medium' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
      <Dialog.Header id='form-dialog-title'>Graph Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <Dropdown
          helpText='You can select more than one values'
          label='Node Labels'
          selectProps={{
            defaultValue: {
              label: 'Person',
              value: 'Person',
            },
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
          <Checkbox label='Use Existing Schema' onChange={(e) => clickHandler(e)} />
        </div>
        <div className='n-size-full n-flex n-flex-col n-items-end n-justify-center n-rounded-md n-bg-palette-neutral-bg-weak n-box-border'>
          <Button
            disabled={!selectedNodes.length || !selectedRels.length}
            className='mt-2'
            onClick={() => console.log({ selectedNodes, selectedRels })}
          >
            Submit
          </Button>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
