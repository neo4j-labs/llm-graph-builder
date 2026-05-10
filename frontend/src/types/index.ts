export interface TextbookFile {
  id: string;
  filename: string;
  format: string;
  size: number;
  status: 'uploading' | 'parsing' | 'completed' | 'failed';
  title?: string;
  totalPages?: number;
  totalChars?: number;
  chapterCount?: number;
}

export interface KnowledgeNode {
  id: string;
  name: string;
  definition: string;
  category: string;
  chapter: string;
  page: number;
  textbookId: string;
  textbookTitle: string;
  frequency?: number;
  status?: 'kept' | 'merged' | 'removed';
}

export interface KnowledgeRelation {
  source: string;
  target: string;
  relationType: 'prerequisite' | 'parallel' | 'contains' | 'applies_to';
  description: string;
}

export interface IntegrationDecision {
  decisionId: string;
  action: 'merge' | 'keep' | 'remove';
  affectedNodes: string[];
  resultNode?: KnowledgeNode;
  reason: string;
  confidence: number;
}

export interface IntegrationStats {
  originalNodeCount: number;
  mergedNodeCount: number;
  originalCharCount: number;
  mergedCharCount: number;
  compressionRatio: number;
  mergeCount: number;
  keepCount: number;
  removeCount: number;
}

export interface RAGCitation {
  textbook: string;
  chapter: string;
  page: number;
  relevanceScore: number;
  chunkContent?: string;
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  sourceChunks: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: RAGCitation[];
}

export interface GraphData {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
}
