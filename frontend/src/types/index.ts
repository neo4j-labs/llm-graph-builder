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
  hasKgCache?: boolean;
}

export interface ChapterPreview {
  title: string;
  charCount: number;
  preview: string;
}

export interface TextbookPreview {
  id: string;
  title: string;
  totalChars: number;
  totalPages: number;
  chapterCount: number;
  chapters: ChapterPreview[];
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

export interface TaskEvent {
  event: 'progress' | 'complete' | 'result' | 'error';
  phase: string;
  step: string;
  current: number;
  total: number;
  percent: number;
  partialResult?: Record<string, any>;
  data?: any;
}

export type TaskType = 'kg_build' | 'integrate' | 'rag_index';

export interface TaskState {
  taskType: TaskType;
  status: 'idle' | 'running' | 'completed' | 'error';
  label: string;
  phase: string;
  step: string;
  current: number;
  total: number;
  percent: number;
  partialResults: Record<string, any>;
  elapsed: number;
  error?: string;
  finalResult?: any;
}
