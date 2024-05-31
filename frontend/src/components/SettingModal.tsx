import { Dialog, Dropdown } from '@neo4j-ndl/react';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, OptionTypeForExamples, UserCredentials, schema } from '../types';
import { useFileContext } from '../context/UsersFiles';
import { getNodeLabelsAndRelTypes } from '../services/GetNodeLabelsRelTypes';
import { useCredentials } from '../context/UserCredentials';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import schemaExamples from '../assets/schemas.json';
import ButtonWithToolTip from './ButtonWithToolTip';
import { tooltips } from '../utils/Constants';

export default function SettingsModal({
  open,
  onClose,
  opneTextSchema,
}: {
  open: boolean;
  onClose: () => void;
  opneTextSchema: () => void;
}) {
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas } =
    useFileContext();
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
  const [defaultExamples, setdefaultExamples] = useState<OptionType[]>([]);

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
    setSelectedSchemas([]);
    setSelectedNodes(nodeLabelOptions);
    setSelectedRels(relationshipTypeOptions);
  }, [nodeLabelOptions, relationshipTypeOptions]);

  return (
    <Dialog size='medium' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
      <Dialog.Header id='form-dialog-title'>Entity Graph Extraction Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <Dropdown
          helpText='Schema Examples'
          label='Predefined Schema'
          selectProps={{
            isClearable: true,
            isMulti: true,
            options: defaultExamples,
            onChange: onChangeSchema,
            value: selectedSchemas,
            menuPosition: 'fixed',
          }}
          type='creatable'
        />
        <Dropdown
          helpText='You can select more than one values'
          label='Node Labels'
          selectProps={{
            isClearable: true,
            isMulti: true,
            options: nodeLabelOptions,
            onChange: onChangenodes,
            value: selectedNodes,
            classNamePrefix: 'node_label',
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
            classNamePrefix: 'relationship_label',
          }}
          type='creatable'
        />
        <div>
          <Button
            loading={loading}
            title={!nodeLabelOptions.length && !relationshipTypeOptions.length ? `No Labels Found in the Database` : ''}
            disabled={!nodeLabelOptions.length && !relationshipTypeOptions.length}
            onClick={clickHandler}
            label='Use Existing Schema'
            placement='top'
          >
            Use Existing Schema
          </ButtonWithToolTip>
          <ButtonWithToolTip
            text={tooltips.createSchema}
            placement='top'
            onClick={() => {
              onClose();
              opneTextSchema();
            }}
            label='Get Existing Schema From Text'
          >
            Get Schema From Text
          </ButtonWithToolTip>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
}
