import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { appLabels, buttonCaptions, getDefaultSchemaExamples, tooltips } from '../../../../utils/Constants';
import { Select, Flex, Typography, useMediaQuery } from '@neo4j-ndl/react';
import { useCredentials } from '../../../../context/UserCredentials';
import { useFileContext } from '../../../../context/UsersFiles';
import { OnChangeValue, ActionMeta } from 'react-select';
import { OptionType, schema } from '../../../../types';
import { getNodeLabelsAndRelTypes } from '../../../../services/GetNodeLabelsRelTypes';
import { tokens } from '@neo4j-ndl/base';
import { showNormalToast } from '../../../../utils/Toasts';
import { useHasSelections } from '../../../../hooks/useHasSelections';
import { Hierarchy1Icon } from '@neo4j-ndl/react/icons';
import GraphViewModal from '../../../Graph/GraphViewModal';

export default function EntityExtractionSetting({
  view,
  open,
  onClose,
  openTextSchema,
  settingView,
  onContinue,
  closeEnhanceGraphSchemaDialog,
}: {
  view: 'Dialog' | 'Tabs';
  open?: boolean;
  onClose?: () => void;
  openTextSchema: () => void;
  settingView: 'contentView' | 'headerView';
  onContinue?: () => void;
  closeEnhanceGraphSchemaDialog?: () => void;
}) {
  const { breakpoints } = tokens;
  const { setSelectedRels, setSelectedNodes, selectedNodes, selectedRels, selectedSchemas, setSelectedSchemas } =
    useFileContext();
  const { userCredentials } = useCredentials();
  const [loading, setLoading] = useState<boolean>(false);
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const hasSelections = useHasSelections(selectedNodes, selectedRels);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('tableView');
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
    for (let index = 0; index < nodesFromSchema.length; index++) {
      const n = nodesFromSchema[index];
      nodeOptionsFromSchema.push({ label: n, value: n });
    }
    let relationshipOptionsFromSchema: OptionType[] = [];
    for (let index = 0; index < relationsFromSchema.length; index++) {
      const r = relationsFromSchema[index];
      relationshipOptionsFromSchema.push({ label: r, value: r });
    }
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
  const defaultExamples = useMemo(() => getDefaultSchemaExamples(), []);

  useEffect(() => {
    if (userCredentials) {
      if (open && view === 'Dialog') {
        const getOptions = async () => {
          setLoading(true);
          try {
            const response = await getNodeLabelsAndRelTypes();
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
            const response = await getNodeLabelsAndRelTypes();
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
    }
  }, [userCredentials, open]);

  const clickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setSelectedSchemas([]);
    setSelectedNodes(nodeLabelOptions);
    setSelectedRels(relationshipTypeOptions);
    localStorage.setItem(
      'selectedNodeLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: nodeLabelOptions })
    );
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: relationshipTypeOptions })
    );
  }, [nodeLabelOptions, relationshipTypeOptions]);

  const handleClear = () => {
    setSelectedNodes([]);
    setSelectedRels([]);
    setSelectedSchemas([]);
    localStorage.setItem('selectedNodeLabels', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] })
    );
    localStorage.setItem('selectedSchemas', JSON.stringify({ db: userCredentials?.uri, selectedOptions: [] }));
    showNormalToast(`Successfully Removed the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
  };
  const handleApply = () => {
    showNormalToast(`Successfully Applied the Schema settings`);
    if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
      closeEnhanceGraphSchemaDialog();
    }
    localStorage.setItem(
      'selectedNodeLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedNodes })
    );
    localStorage.setItem(
      'selectedRelationshipLabels',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedRels })
    );
    localStorage.setItem(
      'selectedSchemas',
      JSON.stringify({ db: userCredentials?.uri, selectedOptions: selectedSchemas })
    );
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

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
        <Select
          helpText='Schema Examples'
          label='Predefined Schema'
          size='medium'
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
        <Select
          helpText='You can select more than one values'
          label='Node Labels'
          size='medium'
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
        <Select
          helpText='You can select more than one values'
          label='Relationship Types'
          size='medium'
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
        <Flex className='mt-4! mb-2 flex! items-center' flexDirection='row' justifyContent='flex-end'>
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
              Load Existing Schema
            </ButtonWithToolTip>
            <ButtonWithToolTip
              label={'Graph Schema'}
              text={tooltips.visualizeGraph}
              placement='top'
              fill='outlined'
              onClick={handleSchemaView}
            >
              <Hierarchy1Icon />
            </ButtonWithToolTip>
            <ButtonWithToolTip
              text={tooltips.createSchema}
              placement='top'
              onClick={() => {
                if (view === 'Dialog' && onClose != undefined) {
                  onClose();
                }
                if (view === 'Tabs' && closeEnhanceGraphSchemaDialog != undefined) {
                  closeEnhanceGraphSchemaDialog();
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
                disabled={!hasSelections}
              >
                {buttonCaptions.clearSettings}
              </ButtonWithToolTip>
            )}
            <ButtonWithToolTip
              text={tooltips.applySettings}
              placement='top'
              onClick={handleApply}
              label='Apply Graph Settings'
              disabled={!hasSelections}
            >
              {buttonCaptions.applyGraphSchema}
            </ButtonWithToolTip>
          </Flex>
        </Flex>
      </div>
      <GraphViewModal open={openGraphView} setGraphViewOpen={setOpenGraphView} viewPoint={viewPoint} />
    </div>
  );
}
