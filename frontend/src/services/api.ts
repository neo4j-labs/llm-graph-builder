import axios from 'axios';
import type {
  TextbookFile,
  GraphData,
  IntegrationDecision,
  IntegrationStats,
  RAGResponse,
  ChatMessage,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000,
});

export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<TextbookFile> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data.data;
}

export async function loadMineruTextbooks(): Promise<TextbookFile[]> {
  const { data } = await api.post('/api/parse/mineru');
  return data.data;
}

export async function getSourceList(): Promise<TextbookFile[]> {
  const { data } = await api.get('/api/sources');
  return data.data;
}

export async function buildKnowledgeGraph(textbookId: string): Promise<GraphData> {
  const { data } = await api.post('/api/kg/build', { textbook_id: textbookId });
  return data.data;
}

export async function getGraphVisualization(textbookIds?: string[]): Promise<GraphData> {
  const { data } = await api.get('/api/kg/visualize', {
    params: textbookIds ? { textbook_ids: textbookIds.join(',') } : {},
  });
  return data.data;
}

export async function integrateKnowledgeGraphs(textbookIds: string[]): Promise<{
  decisions: IntegrationDecision[];
  statistics: IntegrationStats;
}> {
  const { data } = await api.post('/api/kg/integrate', { textbook_ids: textbookIds });
  return data.data;
}

export async function buildRAGIndex(textbookIds: string[]): Promise<{ indexed: number; chunks: number }> {
  const { data } = await api.post('/api/rag/index', { textbook_ids: textbookIds });
  return data.data;
}

export async function queryRAG(question: string, documentNames?: string[]): Promise<RAGResponse> {
  const { data } = await api.post('/api/rag/query', {
    question,
    document_names: documentNames,
  });
  return data.data;
}

export async function getRAGStatus(): Promise<{ indexedBooks: number; totalChunks: number }> {
  const { data } = await api.get('/api/rag/status');
  return data.data;
}

export async function sendChatMessage(
  message: string,
  sessionId: string,
  history: ChatMessage[]
): Promise<ChatMessage> {
  const { data } = await api.post('/api/chat', {
    message,
    session_id: sessionId,
    history: history.map((m) => ({ role: m.role, content: m.content })),
  });
  return data.data;
}

export async function getIntegrationReport(): Promise<{
  overview: IntegrationStats;
  decisions: IntegrationDecision[];
  examples: IntegrationDecision[];
}> {
  const { data } = await api.get('/api/report');
  return data.data;
}

export function getStreamUrl(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `/api${path}?${query}`;
}

export const STREAM_PATHS = {
  kg_build: '/kg/build/stream',
  integrate: '/kg/integrate/stream',
  rag_index: '/rag/index/stream',
} as const;

export default api;
