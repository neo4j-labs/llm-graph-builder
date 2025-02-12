import { NvlOptions } from '@neo4j-nvl/base';
import { GraphType, OptionType } from '../types';
import { getDateTime, getDescriptionForChatMode } from './Utils';
import chatbotmessages from '../assets/ChatbotMessages.json';
import schemaExamples from '../assets/schemas.json';

export const APP_SOURCES =
  process.env.VITE_REACT_APP_SOURCES !== ''
    ? (process.env.VITE_REACT_APP_SOURCES?.split(',') as string[])
    : ['gcs', 's3', 'local', 'wiki', 'youtube', 'web'];

export const llms =
  process.env?.VITE_LLM_MODELS?.trim() != ''
    ? (process.env.VITE_LLM_MODELS?.split(',') as string[])
    : [
        'openai_gpt_3.5',
        'openai-gpt-o3-mini',
        'openai_gpt_4o',
        'openai_gpt_4o_mini',
        'gemini_1.5_pro',
        'gemini_1.5_flash',
        'gemini_2.0_flash',
        'diffbot',
        'azure_ai_gpt_35',
        'azure_ai_gpt_4o',
        'ollama_llama3',
        'groq_llama3_70b',
        'anthropic_claude_3_5_sonnet',
        'fireworks_llama_v3p2_90b',
        'fireworks_qwen72b_instruct',
        'bedrock_claude_3_5_sonnet',
        'bedrock_nova_micro_v1',
        'bedrock_nova_lite_v1',
        'bedrock_nova_pro_v1',
        'fireworks_deepseek_r1',
        'fireworks_deepseek_v3',
      ];

export const supportedLLmsForRagas = [
  'openai_gpt_3.5',
  'openai_gpt_4',
  'openai_gpt_4o',
  'openai_gpt_4o_mini',
  'gemini_1.5_pro',
  'gemini_1.5_flash',
  'gemini_2.0_flash',
  'azure_ai_gpt_35',
  'azure_ai_gpt_4o',
  'groq_llama3_70b',
  'anthropic_claude_3_5_sonnet',
  'fireworks_llama_v3_70b',
  'bedrock_claude_3_5_sonnet',
  'openai-gpt-o3-mini',
];
export const supportedLLmsForGroundTruthMetrics = [
  'openai_gpt_3.5',
  'openai_gpt_4',
  'openai_gpt_4o',
  'openai_gpt_4o_mini',
  'azure_ai_gpt_35',
  'azure_ai_gpt_4o',
  'groq_llama3_70b',
  'anthropic_claude_3_5_sonnet',
  'fireworks_llama_v3_70b',
  'bedrock_claude_3_5_sonnet',
  'openai-gpt-o3-mini',
];
export const prodllms =
  process.env.VITE_LLM_MODELS_PROD?.trim() != ''
    ? (process.env.VITE_LLM_MODELS_PROD?.split(',') as string[])
    : ['openai_gpt_4o', 'openai_gpt_4o_mini', 'diffbot', 'gemini_1.5_flash'];

export const chatModeLables = {
  vector: 'vector',
  graph: 'graph',
  'graph+vector': 'graph_vector',
  fulltext: 'fulltext',
  'graph+vector+fulltext': 'graph_vector_fulltext',
  'entity search+vector': 'entity_vector',
  unavailableChatMode: 'Chat mode is unavailable when files are selected',
  selected: 'Selected',
  'global search+vector+fulltext': 'global_vector',
};
export const chatModeReadableLables: Record<string, string> = {
  vector: 'vector',
  graph: 'graph',
  graph_vector: 'graph+vector',
  fulltext: 'fulltext',
  graph_vector_fulltext: 'graph+vector+fulltext',
  entity_vector: 'entity search+vector',
  unavailableChatMode: 'Chat mode is unavailable when files are selected',
  selected: 'Selected',
  global_vector: 'global search+vector+fulltext',
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
          mode: chatModeLables['graph+vector'],
          description: 'Combines vector indexing and graph connections for contextually enhanced semantic search.',
        },
        {
          mode: chatModeLables.fulltext,
          description: 'Conducts fast, keyword-based search using full-text indexing on text chunks.',
        },
        {
          mode: chatModeLables['graph+vector+fulltext'],
          description: 'Integrates vector, graph, and full-text indexing for comprehensive search results.',
        },
        {
          mode: chatModeLables['entity search+vector'],
          description: 'Uses vector indexing on entity nodes for highly relevant entity-based search.',
        },
        {
          mode: chatModeLables['global search+vector+fulltext'],
          description:
            'Use vector and full-text indexing on community nodes to provide accurate, context-aware answers globally.',
        },
      ];

export const chunkSize = process.env.VITE_CHUNK_SIZE ? parseInt(process.env.VITE_CHUNK_SIZE) : 1 * 1024 * 1024;
export const tokenchunkSize = process.env.VITE_TOKENS_PER_CHUNK ? parseInt(process.env.VITE_TOKENS_PER_CHUNK) : 100;
export const chunkOverlap = process.env.VITE_CHUNK_OVERLAP ? parseInt(process.env.VITE_CHUNK_OVERLAP) : 20;
export const chunksToCombine = process.env.VITE_CHUNK_TO_COMBINE ? parseInt(process.env.VITE_CHUNK_TO_COMBINE) : 1;
export const defaultTokenChunkSizeOptions = [50, 100, 200, 400, 1000];
export const defaultChunkOverlapOptions = [10, 20, 30, 40, 50];
export const defaultChunksToCombineOptions = [1, 2, 3, 4, 5, 6];
export const timeperpage = process.env.VITE_TIME_PER_PAGE ? parseInt(process.env.VITE_TIME_PER_PAGE) : 50;
export const timePerByte = 0.2;
export const largeFileSize = process.env.VITE_LARGE_FILE_SIZE
  ? parseInt(process.env.VITE_LARGE_FILE_SIZE)
  : 5 * 1024 * 1024;

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
  applySettings: 'Apply Graph Schema',
  openChatPopout: 'Chat',
  downloadChat: 'Download Conversation',
  visualizeGraph: 'Visualize Graph Schema',
  additionalInstructions: 'Analyze instructions for schema',
};
export const PRODMODLES = ['openai_gpt_4o', 'openai_gpt_4o_mini', 'diffbot', 'gemini_1.5_flash'];
export const buttonCaptions = {
  exploreGraphWithBloom: 'Explore Graph',
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
  applyGraphSchema: 'Apply',
  provideAdditionalInstructions: 'Provide Additional Instructions for Entity Extractions',
  analyzeInstructions: 'Analyze Instructions',
  helpInstructions: 'Provide specific instructions for entity extraction, such as focusing on the key topics.',
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
    title: 'enable_communities',
    description: 'Enable community creation across entities to use GraphRAG capabilities both local and global search.',
  },
  {
    title: 'graph_schema_consolidation',
    description:
      'This option uses the LLM for large graph schemas to consolidate many node labels and relationship types into fewer, more relevant ones and apply it to the extracted and existing graph',
  },
];
export const RETRY_OPIONS = [
  'start_from_beginning',
  'delete_entities_and_start_from_beginning',
  'start_from_last_processed_position',
];
export const batchSize: number = parseInt(process.env.VITE_BATCH_SIZE ?? '2');

// Graph Constants
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
  neighborView: 'neighborView',
  chunksInfo: 'We are visualizing 50 chunks at a time',
  showSchemaView: 'showSchemaView',
  renderSchemaGraph: 'Graph from Database Schema',
};

export const RESULT_STEP_SIZE = 25;

export const connectionLabels = {
  notConnected: 'Not Connected',
  graphDataScience: 'Graph Data Science',
  graphDatabase: 'Graph Database',
  greenStroke: 'green',
  redStroke: 'red',
};

export const getDefaultMessage = () => {
  return [{ ...chatbotmessages.listMessages[0], datetime: getDateTime() }];
};

export const appLabels = {
  ownSchema: 'Or Define your own Schema',
  predefinedSchema: 'Select a Pre-defined Schema',
  chunkingConfiguration: 'Select a Chunking Configuration',
};

export const LLMDropdownLabel = {
  disabledModels: 'Disabled models are available in the development version. Access more models in our ',
  devEnv: 'development environment',
};
export const getDefaultSchemaExamples = () =>
  schemaExamples.reduce((accu: OptionType[], example) => {
    const examplevalues: OptionType = {
      label: example.schema,
      value: JSON.stringify({
        nodelabels: example.labels,
        relationshipTypes: example.relationshipTypes,
      }),
    };
    accu.push(examplevalues);
    return accu;
  }, []);
export function mergeNestedObjects(objects: Record<string, Record<string, number>>[]) {
  return objects.reduce((merged, obj) => {
    for (const key in obj) {
      if (!merged[key]) {
        merged[key] = {};
      }
      for (const innerKey in obj[key]) {
        merged[key][innerKey] = obj[key][innerKey];
      }
    }
    return merged;
  }, {});
}
export function getStoredSchema() {
  const storedSchemas = localStorage.getItem('selectedSchemas');
  if (storedSchemas) {
    const parsedSchemas = JSON.parse(storedSchemas);
    return parsedSchemas.selectedOptions;
  }
  return [];
}
export const metricsinfo: Record<string, string> = {
  faithfulness: 'Determines How accurately the answer reflects the provided information',
  answer_relevancy: "Determines How well the answer addresses the user's question.",
  rouge_score: 'Determines How much the generated answer matches the reference answer, word-for-word.',
  semantic_score: 'Determines How well the generated answer understands the meaning of the reference answer.',
  context_entity_recall: 'Determines the recall of entities present in both generated answer and retrieved contexts',
};
export const EXPIRATION_DAYS = 3;
export const SKIP_AUTH = (process.env.VITE_SKIP_AUTH ?? 'true') == 'true';
