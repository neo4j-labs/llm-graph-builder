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
  process.env.REACT_APP_SOURCES !== ''
    ? process.env.REACT_APP_SOURCES?.split(',') || []
    : ['gcs', 's3', 'local', 'wiki', 'youtube'];
export const llms =
  process.env?.LLM_MODELS?.trim() != ''
    ? process.env.LLM_MODELS?.split(',')
    : ['Diffbot', 'Gemini 1.0 Pro', 'OpenAI GPT 3.5', 'OpenAI GPT 4o', 'Gemini 1.5 Pro', 'Groq llama3'];

export const defaultLLM = llms?.includes('OpenAI GPT 3.5')
  ? 'OpenAI GPT 3.5'
  : llms?.includes('Gemini 1.0 Pro')
  ? 'Gemini 1.0 Pro'
  : 'Diffbot';

export const chunkSize = process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE) : 5 * 1024 * 1024;
export const timeperpage = process.env.TIME_PER_PAGE ? parseInt(process.env.TIME_PER_PAGE) : 50;
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
  generateGraph: `Only New files will be processed for Graph Visualization`,
  deleteFile: 'Please select a file to delete',
  showGraph: 'Only completed files will be processed for Graph Visualization',
  bloomGraph: 'For advance Graph Visualization',
  deleteSelectedFiles: 'File/Files to be deleted',
  documentation: 'Documentation',
  github: 'GitHub Issues',
  theme: 'Theme',
  settings: 'Settings',
  chat: 'Chat',
  sources: 'Sources',
  deleteChat: 'Delete',
  maximise: 'Maximise',
  copy: 'Copy to Clipboard',
  copied: 'Copied',
  stopSpeaking: 'Stop Speaking',
  textTospeech: 'Text to Speech',
};
