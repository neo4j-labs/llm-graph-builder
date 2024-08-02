import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { appLabels, buttonCaptions, tooltips } from '../../../../utils/Constants';
import { Dropdown, Flex, Typography, useMediaQuery } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, OptionTypeForExamples, schema, UserCredentials } from '../../../../types';
import { useAlertContext } from '../../../../context/Alert';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import schemaExamples from '../../../../assets/schemas.json';
import { tokens } from '@neo4j-ndl/base';

export default function EntityExtractionSetting({
  view,
  open,
  onClose,
  openTextSchema,
  settingView,
  onContinue,
  colseEnhanceGraphSchemaDialog,
}: {
  view: 'Dialog' | 'Tabs';
  open?: boolean;
  onClose?: () => void;
  openTextSchema: () => void;
  settingView: 'contentView' | 'headerView';
  onContinue?: () => void;
  colseEnhanceGraphSchemaDialog?: () => void;
}) {
  const { breakpoints } = tokens;
  const {
    setSelectedRels,
    setSelectedNodes,
    selectedNodes,
    selectedRels,
    selectedSchemas,
    setSelectedSchemas,
    isSchema,
    setIsSchema,
  } = useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
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
    localStorage.setItem('isSchema', JSON.stringify(false));
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
      localStorage.setItem('isSchema', JSON.stringify(true));
      return updatedOptions;
    });
    setIsSchema(true);
  };
  const onChangenodes = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
      localStorage.setItem('isSchema', JSON.stringify(false));
    }
    setSelectedNodes(selectedOptions);
    setIsSchema(true);
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions }));
    localStorage.setItem('isSchema', JSON.stringify(true));
  };
  const onChangerels = (selectedOptions: OnChangeValue<OptionType, true>, actionMeta: ActionMeta<OptionType>) => {
    if (actionMeta.action === 'clear') {
      localStorage.setItem(
        'selectedRelationshipLabels',
        JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
      );
    }
    setSelectedRels(selectedOptions);
    setIsSchema(true);
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
    if (userCredentials) {
      if (open && view === 'Dialog') {
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
        return;
      }
      if (view == 'Tabs') {
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
        setIsSchema(true);
        localStorage.setItem('isSchema', JSON.stringify(true));
      }
    }
  }, [userCredentials, open]);

  const clickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setSelectedSchemas([]);
    setSelectedNodes(nodeLabelOptions);
    setSelectedRels(relationshipTypeOptions);
    setIsSchema(true);
    localStorage.setItem('isSchema', JSON.stringify(true));
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
    if (view === 'Dialog' && onClose != undefined) {
      onClose();
    }
  };

  // Load selectedSchemas from local storage on mount
  useEffect(() => {
    const storedSchemas = localStorage.getItem('selectedSchemas');
    if (storedSchemas) {
      const parsedSchemas = JSON.parse(storedSchemas);
      setSelectedSchemas(parsedSchemas.selectedOptions);
    }
  }, []);

  return (
    <div>
      <Typography variant='body-medium'>
        <span>
          1.Predefine the structure of your knowledge graph by selecting specific node and relationship labels.
        </span>
        <br></br>
        <span>
          2.Focus your analysis by extracting only the relationships and entities that matter most to your use case.
          Achieve a cleaner and more insightful graph representation tailored to your domain.
        </span>
      </Typography>
      <div className='mt-4'>
        <div className='flex align-self-center justify-center'>
          <h5>{appLabels.predefinedSchema}</h5>
        </div>
        <Dropdown
          helpText='Schema Examples'
          label='Predefined Schema'
          size={view === 'Tabs' && !isTablet ? 'large' : isTablet ? 'small' : 'medium'}
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
        <div className='flex align-self-center justify-center'>
          <h5>{appLabels.ownSchema}</h5>
        </div>
        <Dropdown
          helpText='You can select more than one values'
          label='Node Labels'
          size={view === 'Tabs' && !isTablet ? 'large' : isTablet ? 'small' : 'medium'}
          selectProps={{
            isClearable: true,
            isMulti: true,
            options: nodeLabelOptions,
            onChange: onChangenodes,
            value: selectedNodes,
            classNamePrefix: `${
              isTablet ? 'tablet_entity_extraction_Tab_node_label' : 'entity_extraction_Tab_node_label'
            }`,
          }}
          type='creatable'
        />
        <Dropdown
          helpText='You can select more than one values'
          label='Relationship Types'
          size={view === 'Tabs' && !isTablet ? 'large' : isTablet ? 'small' : 'medium'}
          selectProps={{
            isClearable: true,
            isMulti: true,
            options: relationshipTypeOptions,
            onChange: onChangerels,
            value: selectedRels,
            classNamePrefix: `${
              isTablet ? 'tablet_entity_extraction_Tab_relationship_label' : 'entity_extraction_Tab_relationship_label'
            }`,
          }}
          type='creatable'
        />

        <Flex className='!mt-4 flex items-center' flexDirection='row' justifyContent='flex-end'>
          <Flex flexDirection='row' gap='4'>
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
                if (view === 'Dialog' && onClose != undefined) {
                  onClose();
                }
                if (view === 'Tabs' && colseEnhanceGraphSchemaDialog != undefined) {
                  colseEnhanceGraphSchemaDialog();
                }
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
          </Flex>
        </Flex>
      </div>
    </div>
  );
}
