import { createContext, useContext, useState, FC, useEffect } from 'react';
import {
  CustomFile,
  FileContextProviderProps,
  FileContextType,
  OptionType,
  showTextFromSchemaDialogType,
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
  const [queue, setQueue] = useState<Queue>(
    new Queue(JSON.parse(persistedQueue ?? JSON.stringify({ queue: [] })).queue)
  );
  const [model, setModel] = useState<string>(isProdDefaultModel ? selectedModel : isProdEnv ? PRODMODLES[0] : llms[0]);
  const [graphType, setGraphType] = useState<string>('Knowledge Graph Entities');
  const [selectedNodes, setSelectedNodes] = useState<readonly OptionType[]>([]);
  const [selectedRels, setSelectedRels] = useState<readonly OptionType[]>([]);
  const [selectedTokenChunkSize, setSelectedTokenChunkSize] = useState<number>(tokenchunkSize);
  const [selectedChunk_overlap, setSelectedChunk_overlap] = useState<number>(chunkOverlap);
  const [selectedChunks_to_combine, setSelectedChunks_to_combine] = useState<number>(chunksToCombine);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>(getStoredSchema);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [chatModes, setchatModes] = useState<string[]>([chatModeLables['graph+vector+fulltext']]);
  const [showTextFromSchemaDialog, setShowTextFromSchemaDialog] = useState<showTextFromSchemaDialogType>({
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
  const selectedTupleNodeStr = localStorage.getItem('selectedTupleNodeLabels');
  const selectedTupleRelsStr = localStorage.getItem('selectedTupleRelationshipLabels');
  const selectedSchemaModeStr = localStorage.getItem('schemaMode');
  const selectedSourceStr = localStorage.getItem('selectedSource');
  const selectedTypeStr = localStorage.getItem('selectedType');
  const selectedTargetStr = localStorage.getItem('selectedTarget');
  const selectedPatternStr = localStorage.getItem('selectedTuplePatterns');
  const [selectedTupleRels, setSelectedTupleRels] = useState<string[]>([]);
  const [selectedTupleNodes, setSelectedTupleNodes] = useState<readonly OptionType[]>([]);
  const [schemaRelMode, setSchemaRelMode] = useState<string>('code');
  const [selectedSource, setSelectedSource] = useState<OptionType []>([]);
  const [selectedType, setSelectedType] = useState<OptionType []>([]);
  const [selectedTarget, setSelectedTarget] = useState<OptionType []>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [nodesLabels, setNodeLabels]= useState<OptionType[]>([]);
  const [relationshipLabels, setRelationshipLabels]= useState<string[]>([]);

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
    if (selectedTupleNodeStr != null) {
      const selectedTupleNodeLabel = JSON.parse(selectedTupleNodeStr);
      if (userCredentials?.uri === selectedTupleNodeLabel.db) {
        setSelectedTupleNodes(selectedTupleNodeLabel.selectedOptions);
      }
    }
    if (selectedTupleRelsStr != null) {
      const selectedTupleRelLabel = JSON.parse(selectedTupleRelsStr);
      if (userCredentials?.uri === selectedTupleRelLabel.db) {
        setSelectedTupleRels(selectedTupleRelLabel.selectedOptions);
      }
    }
    if (selectedSchemaModeStr != null) {
      const selectedModeLabel = selectedSchemaModeStr;
      setSchemaRelMode(selectedModeLabel);
    }
    if (selectedSourceStr != null) {
      const selectedSourceLabel = JSON.parse(selectedSourceStr);
      if (userCredentials?.uri === selectedSourceLabel.db) {
        setSelectedSource(selectedSourceLabel.selectedOptions);
      }
    }
    if (selectedTypeStr != null) {
      const selectedTypeLabel = JSON.parse(selectedTypeStr);
      if (userCredentials?.uri === selectedTypeLabel.db) {
        setSelectedType(selectedTypeLabel.selectedOptions);
      }
    }
    if (selectedTargetStr != null) {
      const selectedTargetLabel = JSON.parse(selectedTargetStr);
      if (userCredentials?.uri === selectedTargetLabel.db) {
        setSelectedTarget(selectedTargetLabel.selectedOptions);
      }
    }
    if (selectedPatternStr != null) {
      const selectedPatternLabel = JSON.parse(selectedPatternStr);
      if (userCredentials?.uri === selectedPatternLabel.db) {
        setSelectedPatterns(selectedPatternLabel.selectedOptions);
      }
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
    selectedTupleNodes,
    setSelectedTupleNodes,
    selectedTupleRels,
    setSelectedTupleRels,
    schemaRelMode, 
    setSchemaRelMode,
    selectedSource, 
    setSelectedSource,
    selectedType, 
    setSelectedType,
    selectedTarget, 
    setSelectedTarget,
    selectedPatterns, 
    setSelectedPatterns,
    nodesLabels,
    setNodeLabels,
    relationshipLabels,
    setRelationshipLabels
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
