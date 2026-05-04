import { Button, Dialog, Dropzone, Flex, Typography } from '@neo4j-ndl/react';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import { useState } from 'react';
import { OptionType, SchemaSpec, TupleType } from '../../../../types';
import { useFileContext } from '../../../../context/UsersFiles';
import { extractOptions, updateSourceTargetTypeOptions } from '../../../../utils/Utils';
import { getSchemaFromTtl } from '../../../../services/SchemaFromTtl';
import { showErrorToast, showNormalToast } from '../../../../utils/Toasts';
import Loader from '../../../../utils/Loader';
import PatternContainer from './PatternContainer';
import SchemaViz from '../../../Graph/SchemaViz';
import { IconButtonWithToolTip } from '../../../UI/IconButtonToolTip';

interface OwlTtlImporterDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (
    patterns: string[],
    nodeLabels: OptionType[],
    relationshipLabels: OptionType[],
    updatedSource: OptionType[],
    updatedTarget: OptionType[],
    updatedType: OptionType[]
  ) => void;
}

const buildPatterns = (spec: SchemaSpec): string[] =>
  spec.patterns.map((p) => `${p.sourceLabel} -[:${p.relLabel}]-> ${p.targetLabel}`);

const nodePropMap = (spec: SchemaSpec): Record<string, string[]> =>
  Object.fromEntries(spec.nodes.map((n) => [n.label, n.properties.map((p) => p.name)]).filter(([_, props]) => (props as string[]).length));

const relPropMap = (spec: SchemaSpec): Record<string, string[]> =>
  Object.fromEntries(
    spec.relationships.map((r) => [r.label, r.properties.map((p) => p.name)]).filter(([_, props]) => (props as string[]).length)
  );

const OwlTtlImporterDialog = ({ open, onClose, onApply }: OwlTtlImporterDialogProps) => {
  const {
    importerPattern,
    setImporterPattern,
    importerNodes,
    setImporterNodes,
    importerRels,
    setImporterRels,
    sourceOptions,
    setSourceOptions,
    targetOptions,
    setTargetOptions,
    typeOptions,
    setTypeOptions,
    setDbNodeProperties,
    setDbRelProperties,
  } = useFileContext();

  const [loading, setLoading] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [viewPoint, setViewPoint] = useState<string>('');

  const reset = () => {
    setImporterPattern([]);
    setImporterNodes([]);
    setImporterRels([]);
    setDbNodeProperties({});
    setDbRelProperties({});
    setWarnings([]);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const onDropHandler = async (files: Partial<globalThis.File>[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    try {
      const response = await getSchemaFromTtl(file as File);
      if (response.data?.status !== 'Success' || !response.data?.data?.schemaSpec) {
        showErrorToast(response.data?.message ?? 'Failed to parse the uploaded TTL file.');
        return;
      }
      const spec = response.data.data.schemaSpec;
      const patterns = buildPatterns(spec);
      const tuples: TupleType[] = patterns
        .map((p) => {
          const m = p.match(/^(.+?) -\[:(.+?)\]-> (.+)$/);
          if (!m) return null;
          const [, source, type, target] = m;
          return {
            label: `${source} -[:${type}]-> ${target}`,
            value: `${source},${type},${target}`,
            source,
            target,
            type,
          };
        })
        .filter(Boolean) as TupleType[];
      const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(tuples);
      setImporterPattern(patterns);
      setImporterNodes(nodeLabelOptions);
      setImporterRels(relationshipTypeOptions);
      setDbNodeProperties(nodePropMap(spec));
      setDbRelProperties(relPropMap(spec));
      setWarnings(response.data.data.warnings ?? []);
      if (!patterns.length) {
        showNormalToast(
          'TTL parsed but produced no domain/range patterns. Object properties without rdfs:domain/range are skipped.'
        );
      }
    } catch (err) {
      console.error(err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showErrorToast(message ?? 'Error reading TTL file.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePattern = (patternToRemove: string) => {
    const updated = importerPattern.filter((p) => p !== patternToRemove);
    if (!updated.length) {
      reset();
      return;
    }
    const tuples: TupleType[] = updated
      .map((item) => {
        const m = item.match(/^(.+?) -\[:(.+?)\]-> (.+)$/);
        if (!m) return null;
        const [, source, type, target] = m;
        return {
          label: `${source} -[:${type}]-> ${target}`,
          value: `${source},${type},${target}`,
          source,
          target,
          type,
        };
      })
      .filter(Boolean) as TupleType[];
    const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(tuples);
    setImporterPattern(updated);
    setImporterNodes(nodeLabelOptions);
    setImporterRels(relationshipTypeOptions);
  };

  const handleApply = async () => {
    const [newSource, newTarget, newType] = await updateSourceTargetTypeOptions({
      patterns: importerPattern.map((label) => ({ label, value: label })),
      currentSourceOptions: sourceOptions,
      currentTargetOptions: targetOptions,
      currentTypeOptions: typeOptions,
      setSourceOptions,
      setTargetOptions,
      setTypeOptions,
    });
    onApply(importerPattern, importerNodes, importerRels, newSource, newTarget, newType);
    onClose();
  };

  const handleSchemaView = () => {
    setOpenGraphView(true);
    setViewPoint('showSchemaView');
  };

  return (
    <>
      <Dialog isOpen={open} onClose={handleCancel}>
        <Dialog.Header>OWL Ontology (Turtle .ttl) Schema Extraction</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-6 p-6'>
          <Typography variant='body-small'>
            Upload an OWL ontology in Turtle format. owl:Class declarations become node labels;
            owl:DatatypeProperty entries (with rdfs:domain) become typed properties on those nodes;
            owl:ObjectProperty entries (with rdfs:domain and rdfs:range) become relationship patterns.
          </Typography>
          <Dropzone
            loadingComponent={loading && <Loader title='Parsing ontology' />}
            isTesting={true}
            className='bg-none! dropzoneContainer'
            supportedFilesDescription={
              <Typography variant='body-small'>
                <Flex>
                  <span>Drag &amp; drop an ontology file here</span>
                  <div className='align-self-center'>
                    <IconButtonWithToolTip
                      label='Source info'
                      clean
                      text={
                        <Typography variant='body-small'>
                          <Flex gap='3' alignItems='flex-start'>
                            <span>Turtle (.ttl, .owl)</span>
                          </Flex>
                        </Typography>
                      }
                    >
                      <InformationCircleIconOutline className='w-[22px] h-[22px]' />
                    </IconButtonWithToolTip>
                  </div>
                </Flex>
              </Typography>
            }
            dropZoneOptions={{
              accept: {
                'text/turtle': ['.ttl'],
                'application/x-turtle': ['.ttl'],
                'application/rdf+xml': ['.owl'],
                'text/plain': ['.ttl'],
              },
              onDrop: onDropHandler,
              onDropRejected: (e) => {
                if (e.length) {
                  showErrorToast('Failed To Upload, Unsupported file extension.');
                }
              },
            }}
          />
          {warnings.length > 0 && (
            <div className='border border-amber-200 bg-amber-50 p-3 rounded'>
              <Typography variant='body-medium'>Notes from parser:</Typography>
              <ul className='list-disc pl-6'>
                {warnings.map((w, i) => (
                  <li key={i}>
                    <Typography variant='body-small'>{w}</Typography>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <PatternContainer
            pattern={importerPattern}
            handleRemove={handleRemovePattern}
            handleSchemaView={handleSchemaView}
            nodes={importerNodes}
            rels={importerRels}
          />
          <Dialog.Actions className='n-flex n-justify-end n-gap-token-4 pt-4'>
            <Button onClick={handleCancel} isDisabled={importerPattern.length === 0}>
              Cancel
            </Button>
            <Button onClick={handleApply} isDisabled={importerPattern.length === 0}>
              Apply
            </Button>
          </Dialog.Actions>
        </Dialog.Content>
      </Dialog>
      <SchemaViz
        open={openGraphView}
        setGraphViewOpen={setOpenGraphView}
        viewPoint={viewPoint}
        nodeValues={importerNodes ?? []}
        relationshipValues={importerRels ?? []}
      />
    </>
  );
};

export default OwlTtlImporterDialog;
