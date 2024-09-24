import { NvlOptions } from '@neo4j-nvl/base';
import { GraphType, OptionType } from '../types';
import { getDescriptionForChatMode } from './Utils';

export const document = `+ [docs]`;

export const chunks = `+ collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks`;

export const entities = `+ collect { OPTIONAL MATCH (c:Chunk)-[:HAS_ENTITY]->(e), p=(e)-[*0..1]-(:!Chunk) RETURN p}`;

export const docEntities = `+ [docs] 
+ collect { MATCH (c:Chunk)-[:HAS_ENTITY]->(e), p=(e)--(:!Chunk) RETURN p }`;

export const docChunks = `+[chunks]
+collect {MATCH p=(c)-[:FIRST_CHUNK]-() RETURN p} //first chunk
+ collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunk`;

export const chunksEntities = `+ collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } // chunk-chain

+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks
//chunks with entities
+ collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)-[*0..1]-(:!Chunk) RETURN p }`;

export const docChunkEntities = `+[chunks]
+collect {MATCH p=(c)-[:FIRST_CHUNK]-() RETURN p} //first chunk
+ collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks
//chunks with entities
+ collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)-[*0..1]-(:!Chunk) RETURN p }`;

export const APP_SOURCES =
  process.env.VITE_REACT_APP_SOURCES !== ''
    ? (process.env.VITE_REACT_APP_SOURCES?.split(',') as string[])
    : ['gcs', 's3', 'local', 'wiki', 'youtube', 'web'];

export const llms =
  process.env?.VITE_LLM_MODELS?.trim() != ''
    ? (process.env.VITE_LLM_MODELS?.split(',') as string[])
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

export const defaultLLM = llms?.includes('openai-gpt-4o')
  ? 'openai-gpt-4o'
  : llms?.includes('gemini-1.0-pro')
  ? 'gemini-1.0-pro'
  : 'diffbot';

// export const chatModes =
//   process.env?.VITE_CHAT_MODES?.trim() != ''
//     ? process.env.VITE_CHAT_MODES?.split(',')
//     : ['vector', 'graph', 'graph+vector', 'fulltext', 'graph+vector+fulltext', 'local community', 'global community'];

export const chatModeLables = {
  vector: 'vector',
  graph: 'graph',
  graph_vector: 'graph+vector',
  fulltext: 'fulltext',
  graph_vector_fulltext: 'graph+vector+fulltext',
  entity_vector: 'entity search+vector',
  unavailableChatMode: 'Chat mode is unavailable when rows are selected',
  selected: 'Selected',
};
export const chatModes =
  process.env?.VITE_CHAT_MODES?.trim() != ''
    ? process.env.VITE_CHAT_MODES?.split(',').map((mode) => ({
        mode: mode.trim(),
        description: getDescriptionForChatMode(mode.trim()),
      }))
    : [
        {
          mode: chatModeLables.vector,
          description: 'Performs semantic similarity search on text chunks using vector indexing.',
        },
        {
          mode: chatModeLables.graph,
          description: 'Translates text to Cypher queries for precise data retrieval from a graph database.',
        },
        {
          mode: chatModeLables.graph_vector,
          description: 'Combines vector indexing and graph connections for contextually enhanced semantic search.',
        },
        {
          mode: chatModeLables.fulltext,
          description: 'Conducts fast, keyword-based search using full-text indexing on text chunks.',
        },
        {
          mode: chatModeLables.graph_vector_fulltext,
          description: 'Integrates vector, graph, and full-text indexing for comprehensive search results.',
        },
        {
          mode: chatModeLables.entity_vector,
          description: 'Uses vector indexing on entity nodes for highly relevant entity-based search.',
        },
      ];

export const chunkSize = process.env.VITE_CHUNK_SIZE ? parseInt(process.env.VITE_CHUNK_SIZE) : 1 * 1024 * 1024;
export const timeperpage = process.env.VITE_TIME_PER_PAGE ? parseInt(process.env.VITE_TIME_PER_PAGE) : 50;
export const timePerByte = 0.2;
export const largeFileSize = process.env.VITE_LARGE_FILE_SIZE
  ? parseInt(process.env.VITE_LARGE_FILE_SIZE)
  : 5 * 1024 * 1024;
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
  generateGraph: 'Generate graph from selected files',
  deleteFile: 'Select one or more files to delete.',
  showGraph: 'Preview generated graph.',
  bloomGraph: 'Visualize the graph in Bloom',
  deleteSelectedFiles: 'File/Files to be deleted',
  documentation: 'Documentation',
  github: 'GitHub Issues',
  theme: 'Light / Dark mode',
  settings: 'Entity Graph Extraction Settings',
  chat: 'Start a chat',
  sources: 'Upload files',
  deleteChat: 'Delete',
  maximise: 'Maximise',
  copy: 'Copy to Clipboard',
  copied: 'Copied',
  stopSpeaking: 'Stop Speaking',
  textTospeech: 'Text to Speech',
  createSchema: 'Define schema from text.',
  useExistingSchema: 'Fetch schema from database',
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

export const POST_PROCESSING_JOBS: { title: string; description: string }[] = [
  {
    title: 'materialize_text_chunk_similarities',
    description: `This option refines the connections between different pieces of information (chunks) within your
                knowledge graph. By leveraging a k-nearest neighbor algorithm with a similarity threshold (KNN_MIN_SCORE
                of 0.8), this process identifies and links chunks with high semantic similarity. This results in a more
                interconnected and insightful knowledge representation, enabling more accurate and relevant search
                results.`,
  },
  {
    title: 'enable_hybrid_search_and_fulltext_search_in_bloom',
    description: `This option optimizes search capabilities within your knowledge graph. It rebuilds the full-text index
                on database labels, ensuring faster and more efficient retrieval of information. This is particularly
                beneficial for large knowledge graphs, as it significantly speeds up keyword-based searches and improves
                overall query performance.`,
  },
  {
    title: 'materialize_entity_similarities',
    description: `Enhances entity analysis by generating numerical representations (embeddings) that capture their
                semantic meaning. This facilitates tasks like clustering similar entities, identifying duplicates, and
                performing similarity-based searches.`,
  },
  {
    title: 'create_communities',
    description: 'Create Communities identifies and groups similar entities, improving search accuracy and analysis.',
  },
];
export const RETRY_OPIONS = [
  'start_from_beginning',
  'delete_entities_and_start_from_beginning',
  'start_from_last_processed_position',
];
export const batchSize: number = parseInt(process.env.VITE_BATCH_SIZE ?? '2');

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

export const intitalGraphType = (isGDSActive: boolean): GraphType[] => {
  return isGDSActive
    ? ['DocumentChunk', 'Entities', 'Communities'] // GDS is active, include communities
    : ['DocumentChunk', 'Entities']; // GDS is inactive, exclude communities
};

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
  totalRelationships: 'Total Relationships',
  nodeSize: 30,
  docChunk: 'Document & Chunk',
  community: 'Communities',
  noNodesRels: 'No Nodes and No relationships',
};

export const RESULT_STEP_SIZE = 25;

export const connectionLabels = {
  notConnected: 'Not Connected',
  graphDataScience: 'Graph Data Science',
  graphDatabase: 'Graph Database',
  greenStroke: 'green',
  redStroke: 'red',
};
