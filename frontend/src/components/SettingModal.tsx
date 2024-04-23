import { Button, Checkbox, Dialog, Dropdown } from '@neo4j-ndl/react';
import { OnChangeValue } from 'react-select';
import { NODES_OPTIONS, RELATION_OPTIONS } from '../utils/Constants';
import { OptionType } from '../types';
import { useFileContext } from '../context/UsersFiles';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels } = useFileContext();
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>) => setSelectedNodes(selectedOptions);
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>) => setSelectedRels(selectedOptions);

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
            options: NODES_OPTIONS,
            onChange: onChangenodes,
          }}
          type='creatable'
        />
        <Dropdown
          helpText='You can select more than one values'
          label='Relationship Types'
          selectProps={{
            defaultValue: {
              label: 'WORKS_AT',
              value: 'WORKS_AT',
            },
            isClearable: true,
            isMulti: true,
            options: RELATION_OPTIONS,
            onChange: onChangerels,
          }}
          type='creatable'
        />
        <div>
          <Checkbox label='Use Existing Schema' onClick={function Ha() {}} />
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
