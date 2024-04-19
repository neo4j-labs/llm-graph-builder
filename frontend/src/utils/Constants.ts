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

export const colors = [
  '#588c7e',
  '#f2e394',
  '#f2ae72',
  '#d96459',
  '#5b9aa0',
  '#d6d4e0',
  '#b8a9c9',
  '#622569',
  '#ddd5af',
  '#d9ad7c',
  '#a2836e',
  '#674d3c',
  '#d7b69f',
  '#00ffff',
  '#8eb9ff',
  '#f0a900',
  '#d6e9c6',
  '#bb97ae',
  '#7a8ebb',
  '#d39d4c',
  '#eb5050',
  '#d7b69f',
  '#9fd7a1',
  '#6867ad',
  '#ad6777',
  '#9d8a9c',
  '#eaf71d',
];

export const llms =
  process.env?.LLM_MODELS?.trim() != ''
    ? process.env.LLM_MODELS?.split(',')
    : ['Diffbot', 'Gemini 1.0 Pro', 'OpenAI GPT 3.5', 'OpenAI GPT 4', 'Gemini 1.5 Pro'];
export const defaultLLM = llms?.includes('OpenAI GPT 4')
  ? 'OpenAI GPT 4'
  : llms?.includes('Gemini 1.0 Pro')
  ? 'Gemini 1.0 Pro'
  : 'Diffbot';
export const chunkSize = 5 * 1024 * 1024;
