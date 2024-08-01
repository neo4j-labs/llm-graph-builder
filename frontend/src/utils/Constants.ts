import { NvlOptions } from '@neo4j-nvl/base';
import { GraphType, OptionType } from '../types';

export const document = `+ [docs]`;

export const chunks = `+ collect { MATCH p=(c)-[:__NEXT_CHUNK__]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:__SIMILAR__]-() RETURN p } // similar-chunks`;

export const entities = `+ collect { OPTIONAL MATCH (c:__Chunk__)-[:__HAS_ENTITY__]->(e), p=(e)-[*0..1]-(:!__Chunk__) RETURN p}`;

export const docEntities = `+ [docs] 
+ collect { MATCH (c:__Chunk__)-[:__HAS_ENTITY__]->(e), p=(e)--(:!__Chunk__) RETURN p }`;

export const docChunks = `+[chunks]
+collect {MATCH p=(c)-[:__FIRST_CHUNK__]-() RETURN p} //first chunk
+ collect { MATCH p=(c)-[:__NEXT_CHUNK__]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:__SIMILAR__]-() RETURN p } // similar-chunk`;

export const chunksEntities = `+ collect { MATCH p=(c)-[:__NEXT_CHUNK__]-() RETURN p } // chunk-chain

+ collect { MATCH p=(c)-[:__SIMILAR__]-() RETURN p } // similar-chunks
//chunks with entities
+ collect { OPTIONAL MATCH p=(c:__Chunk__)-[:__HAS_ENTITY__]->(e)-[*0..1]-(:!__Chunk__) RETURN p }`;

export const docChunkEntities = `+[chunks]
+collect {MATCH p=(c)-[:__FIRST_CHUNK__]-() RETURN p} //first chunk
+ collect { MATCH p=(c)-[:__NEXT_CHUNK__]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:__SIMILAR__]-() RETURN p } // similar-chunks
//chunks with entities
+ collect { OPTIONAL MATCH p=(c:__Chunk__)-[:__HAS_ENTITY__]->(e)-[*0..1]-(:!__Chunk__) RETURN p }`;
export const APP_SOURCES =
  process.env.REACT_APP_SOURCES !== ''
    ? (process.env.REACT_APP_SOURCES?.split(',') as string[])
    : ['gcs', 's3', 'local', 'wiki', 'youtube', 'web'];
export const llms =
  process.env?.LLM_MODELS?.trim() != ''
    ? (process.env.LLM_MODELS?.split(',') as string[])
    : [
        'diffbot',
        'openai-gpt-3.5',
        'openai-gpt-4o',
        'openai-gpt-4o-mini',
        'gemini-1.0-pro',
        'gemini-1.5-pro',
        'azure_ai_gpt_35',
        'azure_ai_gpt_4o',
        'ollama_llama3',
        'groq_llama3_70b',
        'anthropic_claude_3_5_sonnet',
        'fireworks_v3p1_405b',
        'bedrock_claude_3_5_sonnet',
      ];

export const defaultLLM = llms?.includes('openai-gpt-4o-mini')
  ? 'openai-gpt-4o-mini'
  : llms?.includes('gemini-1.0-pro')
  ? 'gemini-1.0-pro'
  : 'diffbot';
export const chatModes =
  process.env?.CHAT_MODES?.trim() != ''
    ? process.env.CHAT_MODES?.split(',')
    : ['vector', 'graph', 'graph+vector', 'hybrid'];
export const chunkSize = process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE) : 1 * 1024 * 1024;
export const timeperpage = process.env.TIME_PER_PAGE ? parseInt(process.env.TIME_PER_PAGE) : 50;
export const timePerByte = 0.2;
export const largeFileSize = process.env.LARGE_FILE_SIZE ? parseInt(process.env.LARGE_FILE_SIZE) : 5 * 1024 * 1024;
export const NODES_OPTIONS = [
  {
    label: 'Person',
    value: 'Person',
  },
  {
    label: 'Organization',
    value: 'Organization',
  },
  {
    label: 'Event',
    value: 'Event',
  },
];

export const RELATION_OPTIONS = [
  {
    label: 'WORKS_AT',
    value: 'WORKS_AT',
  },
  {
    label: 'IS_CEO',
    value: 'IS_CEO',
  },
  {
    label: 'HOSTS_EVENT',
    value: 'HOSTS_EVENT',
  },
];

export const queryMap: {
  Document: string;
  Chunks: string;
  Entities: string;
  DocEntities: string;
  DocChunks: string;
  ChunksEntities: string;
  DocChunkEntities: string;
} = {
  Document: 'document',
  Chunks: 'chunks',
  Entities: 'entities',
  DocEntities: 'docEntities',
  DocChunks: 'docChunks',
  ChunksEntities: 'chunksEntities',
  DocChunkEntities: 'docChunkEntities',
};

export const tooltips = {
  generateGraph: 'Select one or more (new) files to turn into a graph.',
  deleteFile: 'Select one or more files to delete.',
  showGraph: 'Select one or more files to preview the generated graph.',
  bloomGraph: 'Open Neo4j Bloom for advanced graph interaction and exploration.',
  deleteSelectedFiles: 'File/Files to be deleted',
  documentation: 'Documentation',
  github: 'GitHub Issues',
  theme: 'Light / Dark mode',
  settings: 'Entity Graph Extraction Settings',
  chat: 'Ask questions about the processed documents.',
  sources: 'Upload files of different formats.',
  deleteChat: 'Delete',
  maximise: 'Maximise',
  copy: 'Copy to Clipboard',
  copied: 'Copied',
  stopSpeaking: 'Stop Speaking',
  textTospeech: 'Text to Speech',
  createSchema: 'Create your own schema by passing text',
  useExistingSchema: 'Use the already existing schema from DB',
  clearChat: 'Clear Chat History',
  continue: 'Continue',
  clearGraphSettings: 'Clear configured Graph Schema',
};

export const buttonCaptions = {
  exploreGraphWithBloom: 'Explore Graph with Bloom',
  showPreviewGraph: 'Preview Graph',
  deleteFiles: 'Delete Files',
  generateGraph: 'Generate Graph',
  dropzoneSpan: 'Documents, Images, Unstructured text',
  youtube: 'Youtube',
  gcs: 'GCS',
  amazon: 'Amazon S3',
  noLables: 'No Labels Found in the Database',
  dropYourCreds: 'Drop your neo4j credentials file here',
  analyze: 'Analyze text to extract graph schema',
  connect: 'Connect',
  disconnect: 'Disconnect',
  submit: 'Submit',
  connectToNeo4j: 'Connect to Neo4j',
  cancel: 'Cancel',
  details: 'Details',
  continueSettings: 'Continue',
  clearSettings: 'Clear Schema',
  ask: 'Ask',
};

export const taskParam: string[] = ['update_similarity_graph', 'create_fulltext_index', 'create_entity_embedding'];

export const nvlOptions: NvlOptions = {
  allowDynamicMinZoom: true,
  disableWebGL: true,
  maxZoom: 3,
  minZoom: 0.05,
  relationshipThreshold: 0.55,
  useWebGL: false,
  instanceId: 'graph-preview',
  initialZoom: 1,
};

export const mouseEventCallbacks = {
  onPan: true,
  onZoom: true,
  onDrag: true,
};

// export const graphQuery: string = queryMap.DocChunkEntities;
export const graphView: OptionType[] = [
  { label: 'Lexical Graph', value: queryMap.DocChunks },
  { label: 'Entity Graph', value: queryMap.Entities },
  { label: 'Knowledge Graph', value: queryMap.DocChunkEntities },
];
export const intitalGraphType: GraphType[] = ['DocumentChunk', 'Entities'];

export const appLabels = {
  ownSchema: 'Or Define your own Schema',
  predefinedSchema: 'Select a Pre-defined Schema',
};

export const graphLabels = {
  showGraphView: 'showGraphView',
  chatInfoView: 'chatInfoView',
  generateGraph: 'Generated Graph',
  inspectGeneratedGraphFrom: 'Inspect Generated Graph from',
  document: 'Document',
  chunk: 'Chunk',
  documentChunk: 'DocumentChunk',
  entities: 'Entities',
  resultOverview: 'Result Overview',
  totalNodes: 'Total Nodes',
  noEntities: 'No Entities Found',
  selectCheckbox: 'Select atleast one checkbox for graph view',
};
