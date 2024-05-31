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
  const [loading, setLoading] = useState<boolean>(false);
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>) => {
    setSelectedNodes(selectedOptions);
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
  };
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>) => {
    setSelectedRels(selectedOptions);
    localStorage.setItem('selectedRelationshipLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
  };
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);

  useEffect(() => {
    if (userCredentials && open) {
      const getOptions = async () => {
        setLoading(true);
        try {
          const response = await getNodeLabelsAndRelTypes(userCredentials as UserCredentials);
          setLoading(false);
          if (response.data.data.length) {
            const nodelabels = response.data?.data[0]?.labels?.slice(0, 20).map((l) => ({ value: l, label: l }));
            const reltypes = response.data?.data[0]?.relationshipTypes
              .slice(0, 20)
              .map((t) => ({ value: t, label: t }));
            setnodeLabelOptions(nodelabels);
            setrelationshipTypeOptions(reltypes);
          }
        } catch (error) {
          setLoading(false);
          console.log(error);
        }
      };
      getOptions();
    }
  }, [userCredentials, open]);

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
          <Button
            loading={loading}
            title={!nodeLabelOptions.length && !relationshipTypeOptions.length ? `No Labels Found in the Database` : ''}
            disabled={!nodeLabelOptions.length && !relationshipTypeOptions.length}
            onClick={clickHandler}
          >
            Use Existing Schema
          </Button>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
