import { Dialog, Dropdown } from '@neo4j-ndl/react';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, OptionTypeForExamples, SettingsModalProps, UserCredentials, schema } from '../../../types';
import { useFileContext } from '../../../context/UsersFiles';
import { getNodeLabelsAndRelTypes } from '../../../services/GetNodeLabelsRelTypes';
import { useCredentials } from '../../../context/UserCredentials';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import schemaExamples from '../../../assets/schemas.json';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
import { buttonCaptions, tooltips } from '../../../utils/Constants';
import { useAlertContext } from '../../../context/Alert';

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  openTextSchema,
  onContinue,
  settingView,
  setIsSchema,
  isSchema,
}) => {
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas } =
    useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);

  const removeNodesAndRels = (nodelabels: string[], relationshipTypes: string[]) => {
    const labelsToRemoveSet = new Set(nodelabels);
    const relationshipLabelsToremoveSet = new Set(relationshipTypes);
    setSelectedNodes((prevState) => {
      const filterednodes = prevState.filter((item) => !labelsToRemoveSet.has(item.label));
      localStorage.setItem(
        'selectedNodeLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: filterednodes })
      );
      return filterednodes;
    });
    setSelectedRels((prevState) => {
      const filteredrels = prevState.filter((item) => !relationshipLabelsToremoveSet.has(item.label));
      localStorage.setItem(
        'selectedRelationshipLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: filteredrels })
      );
      return filteredrels;
    });
  };
  const onChangeSchema = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'remove-value') {
      const removedSchema: schema = JSON.parse(actionMeta.removedValue.value);
      const { nodelabels, relationshipTypes } = removedSchema;
      removeNodesAndRels(nodelabels, relationshipTypes);
    } else if (actionMeta.action === 'clear') {
      const removedSchemas = actionMeta.removedValues.map((s) => JSON.parse(s.value));
      const removedNodelabels = removedSchemas.map((s) => s.nodelabels).flatMap((k) => k);
      const removedRelations = removedSchemas.map((s) => s.relationshipTypes).flatMap((k) => k);
      removeNodesAndRels(removedNodelabels, removedRelations);
    }
    setSelectedSchemas(selectedOptions);
    localStorage.setItem(
      'selectedSchemas',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedOptions })
    );
    const nodesFromSchema = selectedOptions.map((s) => JSON.parse(s.value).nodelabels).flat();
    const relationsFromSchema = selectedOptions.map((s) => JSON.parse(s.value).relationshipTypes).flat();
    let nodeOptionsFromSchema: OptionType[] = [];
    nodesFromSchema.forEach((n) => nodeOptionsFromSchema.push({ label: n, value: n }));
    let relationshipOptionsFromSchema: OptionType[] = [];
    relationsFromSchema.forEach((r) => relationshipOptionsFromSchema.push({ label: r, value: r }));
    setSelectedNodes((prev) => {
      const combinedData = [...prev, ...nodeOptionsFromSchema];
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
    setSelectedRels((prev) => {
      const combinedData = [...prev, ...relationshipOptionsFromSchema];
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
  };
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    }
    setSelectedNodes(selectedOptions);
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
  };
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      localStorage.setItem(
        'selectedRelationshipLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
      );
    }
    setSelectedRels(selectedOptions);
    localStorage.setItem('selectedRelationshipLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
  };
  const [nodeLabelOptions, setnodeLabelOptions] = useState<OptionType[]>([]);
  const [relationshipTypeOptions, setrelationshipTypeOptions] = useState<OptionType[]>([]);
  const [defaultExamples, setdefaultExamples] = useState<OptionType[]>([]);

  const { showAlert } = useAlertContext();

  useEffect(() => {
    const parsedData = schemaExamples.reduce((accu: OptionTypeForExamples[], example) => {
      const examplevalues: OptionTypeForExamples = {
        label: example.schema,
        value: JSON.stringify({
          nodelabels: example.labels,
          relationshipTypes: example.relationshipTypes,
        }),
      };
      accu.push(examplevalues);
      return accu;
    }, []);
    setdefaultExamples(parsedData);
  }, []);

  useEffect(() => {
    if (userCredentials && open) {
      const getOptions = async () => {
        setLoading(true);
        try {
          const response = await getNodeLabelsAndRelTypes(userCredentials as UserCredentials);
          setLoading(false);
          if (response.data.data.length) {
            const nodelabels = response.data?.data[0]?.labels.map((l) => ({ value: l, label: l }));
            const reltypes = response.data?.data[0]?.relationshipTypes.map((t) => ({ value: t, label: t }));
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

  const handleClear = () => {
    setIsSchema(false);
    setSelectedNodes([]);
    setSelectedRels([]);
    setSelectedSchemas([]);
    localStorage.setItem('isSchema', JSON.stringify(false));
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
    );
    localStorage.setItem('selectedSchemas', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    showAlert('info', `Successfully Removed the Schema settings`);
    onClose();
  };

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
          type='select'
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
        <Dialog.Actions className='!mt-4 flex items-center'>
          <ButtonWithToolTip
            loading={loading}
            text={
              !nodeLabelOptions.length && !relationshipTypeOptions.length
                ? `No Labels Found in the Database`
                : tooltips.useExistingSchema
            }
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
              openTextSchema();
            }}
            label='Get Existing Schema From Text'
          >
            Get Schema From Text
          </ButtonWithToolTip>
          {settingView === 'contentView' ? (
            <ButtonWithToolTip
              text={tooltips.continue}
              placement='top'
              onClick={onContinue}
              label='Continue to extract'
            >
              {buttonCaptions.continueSettings}
            </ButtonWithToolTip>
          ) : (
            <ButtonWithToolTip
              text={tooltips.clearGraphSettings}
              placement='top'
              onClick={handleClear}
              label='Clear Graph Settings'
              disabled={!isSchema}
            >
              {buttonCaptions.clearSettings}
            </ButtonWithToolTip>
          )}
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
};

export default SettingsModal;
