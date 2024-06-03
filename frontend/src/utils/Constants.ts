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
export const llms =
  process.env?.LLM_MODELS?.trim() != ''
    ? process.env.LLM_MODELS?.split(',')
    : ['Diffbot', 'Gemini 1.0 Pro', 'OpenAI GPT 3.5', 'OpenAI GPT 4o', 'Gemini 1.5 Pro'];

export const defaultLLM = llms?.includes('OpenAI GPT 3.5')
  ? 'OpenAI GPT 3.5'
  : llms?.includes('Gemini 1.0 Pro')
  ? 'Gemini 1.0 Pro'
  : 'Diffbot';

export const chunkSize = process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE) : 5 * 1024 * 1024;

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
