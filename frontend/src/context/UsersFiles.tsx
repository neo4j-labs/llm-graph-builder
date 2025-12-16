import { createContext, useContext, useState, FC, useEffect } from 'react';
import {
  CustomFile,
  FileContextProviderProps,
  FileContextType,
  OptionType,
  showTextFromSchemaDialogType,
  schemaLoadDialogType,
  predefinedSchemaDialogType,
  dataImporterSchemaDialogType,
} from '../types';
import {
  chatModeLables,
  getStoredSchema,
  llms,
  PRODMODLES,
  chunkOverlap,
  chunksToCombine,
  tokenchunkSize,
} from '../utils/Constants';
import { useCredentials } from './UserCredentials';
import Queue from '../utils/Queue';

const FileContext = createContext<FileContextType | undefined>(undefined);

const FileContextProvider: FC<FileContextProviderProps> = ({ children }) => {
  const isProdEnv = process.env.VITE_ENV === 'PROD';
  const selectedNodeLabelstr = localStorage.getItem('selectedNodeLabels');
  const selectedNodeRelsstr = localStorage.getItem('selectedRelationshipLabels');
  const selectedTokenChunkSizeStr = localStorage.getItem('selectedTokenChunkSize');
  const selectedChunk_overlapStr = localStorage.getItem('selectedChunk_overlap');
  const selectedChunks_to_combineStr = localStorage.getItem('selectedChunks_to_combine');
  const persistedQueue = localStorage.getItem('waitingQueue');
  const selectedModel = localStorage.getItem('selectedModel');
  const selectedInstructstr = localStorage.getItem('instructions');
  const isProdDefaultModel = isProdEnv && selectedModel && PRODMODLES.includes(selectedModel);
  const { userCredentials } = useCredentials();
  const [files, setFiles] = useState<(File | null)[] | []>([]);
  const [filesData, setFilesData] = useState<CustomFile[] | []>([]);
  const [queue, setQueue] = useState<Queue<CustomFile>>(
    new Queue(JSON.parse(persistedQueue ?? JSON.stringify({ queue: [] })).queue)
  );
  const [model, setModel] = useState<string>(isProdDefaultModel ? selectedModel : isProdEnv ? PRODMODLES[0] : llms[0]);
  const [graphType, setGraphType] = useState<string>('Knowledge Graph Entities');
  const [selectedNodes, setSelectedNodes] = useState<readonly OptionType[]>([]);
  const [selectedRels, setSelectedRels] = useState<readonly OptionType[]>([]);
  const [selectedTokenChunkSize, setSelectedTokenChunkSize] = useState<number>(tokenchunkSize);
  const [selectedChunk_overlap, setSelectedChunk_overlap] = useState<number>(chunkOverlap);
  const [selectedChunks_to_combine, setSelectedChunks_to_combine] = useState<number>(chunksToCombine);
  const [selectedSchemas, setSelectedSchemas] = useState<readonly OptionType[]>(getStoredSchema);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [chatModes, setchatModes] = useState<string[]>([chatModeLables['graph+vector+fulltext']]);

  const [showTextFromSchemaDialog, setShowTextFromSchemaDialog] = useState<showTextFromSchemaDialogType>({
    triggeredFrom: '',
    show: false,
  });
  const [schemaLoadDialog, setSchemaLoadDialog] = useState<schemaLoadDialogType>({
    triggeredFrom: '',
    show: false,
  });

  const [predefinedSchemaDialog, setPredefinedSchemaDialog] = useState<predefinedSchemaDialogType>({
    triggeredFrom: '',
    show: false,
  });

  const [dataImporterSchemaDialog, setDataImporterSchemaDialog] = useState<dataImporterSchemaDialogType>({
    triggeredFrom: '',
    show: false,
  });

  const [postProcessingTasks, setPostProcessingTasks] = useState<string[]>([
    'materialize_text_chunk_similarities',
    'enable_hybrid_search_and_fulltext_search_in_bloom',
    'materialize_entity_similarities',
    'enable_communities',
  ]);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [postProcessingVal, setPostProcessingVal] = useState<boolean>(false);
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [schemaTextPattern, setSchemaTextPattern] = useState<string[]>([]);
  const [allPatterns, setAllPatterns] = useState<string[]>([]);
  const [userDefinedPattern, setUserDefinedPattern] = useState<string[]>([]);
  const [dbPattern, setDbPattern] = useState<string[]>([]);
  const [schemaValNodes, setSchemaValNodes] = useState<OptionType[]>([]);
  const [schemaValRels, setSchemaValRels] = useState<OptionType[]>([]);
  const [dbNodes, setDbNodes] = useState<OptionType[]>([]);
  const [dbRels, setDbRels] = useState<OptionType[]>([]);
  const [preDefinedNodes, setPreDefinedNodes] = useState<OptionType[]>([]);
  const [preDefinedRels, setPreDefinedRels] = useState<OptionType[]>([]);
  const [userDefinedNodes, setUserDefinedNodes] = useState<OptionType[]>([]);
  const [userDefinedRels, setUserDefinedRels] = useState<OptionType[]>([]);
  const [preDefinedPattern, setPreDefinedPattern] = useState<string[]>([]);
  const [selectedPreDefOption, setSelectedPreDefOption] = useState<OptionType | null>(null);
  const [sourceOptions, setSourceOptions] = useState<OptionType[]>([]);
  const [typeOptions, setTypeOptions] = useState<OptionType[]>([]);
  const [targetOptions, setTargetOptions] = useState<OptionType[]>([]);

  // Importer schema
  const [importerNodes, setImporterNodes] = useState<OptionType[]>([]);
  const [importerRels, setImporterRels] = useState<OptionType[]>([]);
  const [importerPattern, setImporterPattern] = useState<string[]>([]);

  useEffect(() => {
    if (selectedNodeLabelstr != null) {
      const selectedNodeLabel = JSON.parse(selectedNodeLabelstr);
      if (userCredentials?.uri === selectedNodeLabel.db) {
        setSelectedNodes(selectedNodeLabel.selectedOptions);
      }
    }
    if (selectedNodeRelsstr != null) {
      const selectedNodeRels = JSON.parse(selectedNodeRelsstr);
      if (userCredentials?.uri === selectedNodeRels.db) {
        setSelectedRels(selectedNodeRels.selectedOptions);
      }
    }
    if (selectedNodeRelsstr != null) {
      const selectedNodeRels = JSON.parse(selectedNodeRelsstr);
      if (userCredentials?.uri === selectedNodeRels.db) {
        const rels = selectedNodeRels.selectedOptions;
        setSelectedRels(rels);
        const generatedPatterns = rels.map((rel: { value: string }) => {
          const [source, type, target] = rel.value.split(',');
          return `(${source})-[${type}]->(${target})`;
        });
        setAllPatterns(generatedPatterns);
      }
    }
    if (selectedTokenChunkSizeStr != null) {
      const parsedSelectedChunk_size = JSON.parse(selectedTokenChunkSizeStr);
      setSelectedTokenChunkSize(parsedSelectedChunk_size.selectedOption);
    }
    if (selectedChunk_overlapStr != null) {
      const parsedSelectedChunk_overlap = JSON.parse(selectedChunk_overlapStr);
      setSelectedChunk_overlap(parsedSelectedChunk_overlap.selectedOption);
    }
    if (selectedChunks_to_combineStr != null) {
      const parsedSelectedChunks_to_combine = JSON.parse(selectedChunks_to_combineStr);
      setSelectedChunk_overlap(parsedSelectedChunks_to_combine.selectedOption);
    }
    if (selectedInstructstr != null) {
      const selectedInstructions = selectedInstructstr;
      setAdditionalInstructions(selectedInstructions);
    }
  }, [userCredentials]);

  const value: FileContextType = {
    files,
    filesData,
    setFiles,
    setFilesData,
    model,
    setModel,
    graphType,
    setGraphType,
    selectedRels,
    setSelectedRels,
    selectedNodes,
    setSelectedNodes,
    selectedTokenChunkSize,
    setSelectedTokenChunkSize,
    selectedChunk_overlap,
    setSelectedChunk_overlap,
    selectedChunks_to_combine,
    setSelectedChunks_to_combine,
    rowSelection,
    setRowSelection,
    selectedRows,
    setSelectedRows,
    selectedSchemas,
    setSelectedSchemas,
    chatModes,
    setchatModes,
    setShowTextFromSchemaDialog,
    showTextFromSchemaDialog,
    postProcessingTasks,
    setPostProcessingTasks,
    queue,
    setQueue,
    processedCount,
    setProcessedCount,
    postProcessingVal,
    setPostProcessingVal,
    additionalInstructions,
    setAdditionalInstructions,
    schemaTextPattern,
    setSchemaTextPattern,
    allPatterns,
    setAllPatterns,
    schemaValRels,
    setSchemaValRels,
    schemaValNodes,
    setSchemaValNodes,
    schemaLoadDialog,
    setSchemaLoadDialog,
    dbNodes,
    setDbNodes,
    dbRels,
    setDbRels,
    dbPattern,
    setDbPattern,
    predefinedSchemaDialog,
    setPredefinedSchemaDialog,
    preDefinedNodes,
    setPreDefinedNodes,
    preDefinedRels,
    setPreDefinedRels,
    preDefinedPattern,
    setPreDefinedPattern,
    userDefinedNodes,
    setUserDefinedNodes,
    userDefinedRels,
    setUserDefinedRels,
    userDefinedPattern,
    setUserDefinedPattern,
    selectedPreDefOption,
    setSelectedPreDefOption,
    sourceOptions,
    setSourceOptions,
    typeOptions,
    setTypeOptions,
    targetOptions,
    setTargetOptions,
    dataImporterSchemaDialog,
    setDataImporterSchemaDialog,
    importerNodes,
    setImporterNodes,
    importerRels,
    setImporterRels,
    importerPattern,
    setImporterPattern,
  };
  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};
const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileContextProvider');
  }
  return context;
};
export { FileContextProvider, useFileContext };
