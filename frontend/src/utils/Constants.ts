export const document = `+ [docs]`;

export const chunks = `+ [chunks] + collect { MATCH p=(c)-[:NEXT_CHUNK]->() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks`;

export const entities = `+ collect { MATCH (c:Chunk)-[:HAS_ENTITY]->(e), p=(e)--(:!Chunk) RETURN p }`;

export const docEntities = `+ [docs] 
+ collect { MATCH (c:Chunk)-[:HAS_ENTITY]->(e), p=(e)--(:!Chunk) RETURN p }`;

export const docChunks = `+ [chunks] // documents with chunks
+ collect { MATCH p=(c)-[:NEXT_CHUNK]->() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks
+ [docs]`;

export const chunksEntities = `// if chunks:
+ [chunks] // documents with chunks
+ collect { MATCH p=(c)-[:NEXT_CHUNK]->() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks
//chunks with entities
+ collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)--(:!Chunk) RETURN p } // chunks and entities`;

export const docChunkEntities = `// if documents:
+ [docs] // documents
// if chunks:
+ [chunks] // documents with chunks
+ collect { MATCH p=(c)-[:NEXT_CHUNK]-() RETURN p } // chunk-chain
+ collect { MATCH p=(c)-[:SIMILAR]-() RETURN p } // similar-chunks
//chunks with entities
+ collect { OPTIONAL MATCH p=(c:Chunk)-[:HAS_ENTITY]->(e)--(:!Chunk) RETURN p }`;

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
];
