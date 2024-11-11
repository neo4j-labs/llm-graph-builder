import { calcWordColor } from '@neo4j-devtools/word-color';
import type { Relationship } from '@neo4j-nvl/base';
import {
  CustomFile,
  Entity,
  ExtendedNode,
  ExtendedRelationship,
  GraphType,
  Messages,
  Scheme,
  SourceNode,
  UserCredentials,
} from '../types';
import Wikipediadarkmode from '../assets/images/wikipedia-darkmode.svg';
import Wikipediadlogo from '../assets/images/wikipedia.svg';
import webdarklogo from '../assets/images/web-darkmode.svg';
import weblogo from '../assets/images/web.svg';
import youtubedarklogo from '../assets/images/youtube-darkmode.svg';
import youtubelightlogo from '../assets/images/youtube-lightmode.svg';
import s3logo from '../assets/images/s3logo.png';
import gcslogo from '../assets/images/gcs.webp';
import { chatModeLables } from './Constants';

// Get the Url
export const url = () => {
  let url = window.location.href.replace('5173', '8000');
  if (process.env.VITE_BACKEND_API_URL) {
    url = process.env.VITE_BACKEND_API_URL;
  }
  return !url || !url.match('/$') ? url : url.substring(0, url.length - 1);
};

// validation check for s3 bucket url
export const validation = (url: string) => {
  return url.trim() != '' && /^s3:\/\/([^/]+)\/?$/.test(url) != false;
};

export const wikiValidation = (url: string) => {
  return url.trim() != '' && /https:\/\/([a-zA-Z]{2,3})\.wikipedia\.org\/wiki\/(.*)/gm.test(url) != false;
};
export const webLinkValidation = (url: string) => {
  return (
    url.trim() != '' &&
    /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_.~#?&//=]*)/g.test(url) != false
  );
};
export const youtubeLinkValidation = (url: string) => {
  return (
    url.trim() != '' &&
    /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/.test(
      url
    ) != false
  );
};
// Status indicator icons to status column
export const statusCheck = (status: string) => {
  switch (status) {
    case 'New':
      return 'info';
    case 'N/A':
      return 'unknown';
    case 'Completed':
      return 'success';
    case 'Processing':
      return 'warning';
    case 'Uploading':
      return 'warning';
    case 'Failed':
      return 'danger';
    case 'Upload Failed':
      return 'danger';
    case 'Reprocess':
      return 'info';
    default:
      return 'unknown';
  }
};

// Graph Functions
export const constructQuery = (queryTochange: string, docLimit: string) => {
  return `MATCH docs = (d:Document {status:'Completed'}) 
  WITH docs, d ORDER BY d.createdAt DESC 
  LIMIT ${docLimit}
  CALL { WITH d
    OPTIONAL MATCH chunks=(d)<-[:PART_OF]-(c:Chunk)
    RETURN chunks, c LIMIT 50
  }
  WITH [] 
  ${queryTochange}
  AS paths
  CALL { WITH paths UNWIND paths AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }
  CALL { WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }
  RETURN nodes, rels`;
};

export const constructDocQuery = (queryTochange: string) => {
  return `
MATCH docs = (d:Document {status:'Completed'}) 
WHERE d.fileName = $document_name
WITH docs, d ORDER BY d.createdAt DESC 
CALL { WITH d
  OPTIONAL MATCH chunks=(d)<-[:PART_OF]-(c:Chunk)
  RETURN chunks, c LIMIT 50
}
WITH [] 
${queryTochange}
AS paths
CALL { WITH paths UNWIND paths AS path UNWIND nodes(path) as node RETURN collect(distinct node) as nodes }
CALL { WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) as rels }
RETURN nodes, rels`;
};

export const getSize = (node: any) => {
  if (node.labels[0] == 'Document') {
    return 40;
  }
  if (node.labels[0] == 'Chunk') {
    return 30;
  }
  return undefined;
};

export const getNodeCaption = (node: any) => {
  if (node.properties.name) {
    return node.properties.name;
  }
  if (node.properties.text) {
    return node.properties.text;
  }
  if (node.properties.fileName) {
    return node.properties.fileName;
  }
  if(node.labels[0] === '__Community__'){
    return node.properties.title;
  }
  return node.properties.id;
};

export const getIcon = (node: any) => {
  if (node.labels[0] == 'Document') {
    return 'paginate-filter-text.svg';
  }
  if (node.labels[0] == 'Chunk') {
    return 'paragraph-left-align.svg';
  }
  return undefined;
};
export function extractPdfFileName(url: string): string {
  const splitUrl = url.split('/');
  const [encodedFileName] = splitUrl[splitUrl.length - 1].split('?');
  const decodedFileName = decodeURIComponent(encodedFileName);
  if (decodedFileName.includes('/')) {
    const splitedstr = decodedFileName.split('/');
    return splitedstr[splitedstr.length - 1];
  }
  return decodedFileName;
}

export const processGraphData = (neoNodes: ExtendedNode[], neoRels: ExtendedRelationship[]) => {
  const schemeVal: Scheme = {};
  let iterator = 0;
  const labels: string[] = neoNodes.flatMap((f: any) => f.labels);
  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    if (schemeVal[label] == undefined) {
      schemeVal[label] = calcWordColor(label);
      iterator += 1;
    }
  }
  const newNodes: ExtendedNode[] = neoNodes.map((g: any) => {
    return {
      id: g.element_id,
      size: getSize(g),
      captionAlign: 'bottom',
      iconAlign: 'bottom',
      caption: getNodeCaption(g),
      color: schemeVal[g.labels[0]],
      icon: getIcon(g),
      labels: g.labels,
      properties: g.properties,
    };
  });
  const finalNodes = newNodes.flat();
  // Process relationships
  const newRels: Relationship[] = neoRels.map((relations: any) => {
    return {
      id: relations.element_id,
      from: relations.start_node_element_id,
      to: relations.end_node_element_id,
      caption: relations.type,
    };
  });
  const finalRels = newRels.flat();
  return { finalNodes, finalRels, schemeVal };
};

/**
 * Filters nodes, relationships, and scheme based on the selected graph types.
 *
 * @param graphType - An array of graph types to filter by (e.g., 'DocumentChunk', 'Entities', 'Communities').
 * @param allNodes - An array of all nodes present in the graph.
 * @param allRelationships - An array of all relationships in the graph.
 * @param scheme - The scheme object containing node and relationship information.
 * @returns An object containing filtered nodes, relationships, and scheme based on the selected graph types.
 */
export const filterData = (
  graphType: GraphType[],
  allNodes: ExtendedNode[],
  allRelationships: Relationship[],
  scheme: Scheme
) => {
  let filteredNodes: ExtendedNode[] = [];
  let filteredRelations: Relationship[] = [];
  let filteredScheme: Scheme = {};
  const entityTypes = Object.keys(scheme).filter(
    (type) => type !== 'Document' && type !== 'Chunk' && type !== '__Community__'
  );
  // Only Document + Chunk
  // const processedEntities = entityTypes.flatMap(item => item.includes(',') ? item.split(',') : item);
  if (graphType.includes('DocumentChunk') && !graphType.includes('Entities') && !graphType.includes('Communities')) {
    filteredNodes = allNodes.filter(
      (node) => (node.labels.includes('Document') && node.properties.fileName) || node.labels.includes('Chunk')
    );
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    filteredRelations = allRelationships.filter(
      (rel) =>
        ['PART_OF', 'FIRST_CHUNK', 'SIMILAR', 'NEXT_CHUNK'].includes(rel.caption ?? '') &&
        nodeIds.has(rel.from) &&
        nodeIds.has(rel.to)
    );
    filteredScheme = { Document: scheme.Document, Chunk: scheme.Chunk };
    // Only Entity
  } else if (
    graphType.includes('Entities') &&
    !graphType.includes('DocumentChunk') &&
    !graphType.includes('Communities')
  ) {
    const entityNodes = allNodes.filter(
      (node) =>
        !node.labels.includes('Document') && !node.labels.includes('Chunk') && !node.labels.includes('__Community__')
    );
    filteredNodes = entityNodes ? entityNodes : [];
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    filteredRelations = allRelationships.filter(
      (rel) =>
        !['PART_OF', 'FIRST_CHUNK', 'HAS_ENTITY', 'SIMILAR', 'NEXT_CHUNK'].includes(rel.caption ?? '') &&
        nodeIds.has(rel.from) &&
        nodeIds.has(rel.to)
    );
    filteredScheme = Object.fromEntries(entityTypes.map((key) => [key, scheme[key]])) as Scheme;
    // Only Communities
  } else if (
    graphType.includes('Communities') &&
    !graphType.includes('DocumentChunk') &&
    !graphType.includes('Entities')
  ) {
    filteredNodes = allNodes.filter((node) => node.labels.includes('__Community__'));
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    filteredRelations = allRelationships.filter(
      (rel) =>
        ['IN_COMMUNITY', 'PARENT_COMMUNITY'].includes(rel.caption ?? '') && nodeIds.has(rel.from) && nodeIds.has(rel.to)
    );
    filteredScheme = { __Community__: scheme.__Community__ };
    // Document + Chunk + Entity
  } else if (
    graphType.includes('DocumentChunk') &&
    graphType.includes('Entities') &&
    !graphType.includes('Communities')
  ) {
    filteredNodes = allNodes.filter(
      (node) =>
        (node.labels.includes('Document') && node.properties.fileName) ||
        node.labels.includes('Chunk') ||
        (!node.labels.includes('Document') && !node.labels.includes('Chunk') && !node.labels.includes('__Community__'))
    );
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    filteredRelations = allRelationships.filter(
      (rel) =>
        !['IN_COMMUNITY', 'PARENT_COMMUNITY'].includes(rel.caption ?? '') &&
        nodeIds.has(rel.from) &&
        nodeIds.has(rel.to)
    );
    filteredScheme = {
      Document: scheme.Document,
      Chunk: scheme.Chunk,
      ...Object.fromEntries(entityTypes.map((key) => [key, scheme[key]])),
    };
    // Entities + Communities
  } else if (
    graphType.includes('Entities') &&
    graphType.includes('Communities') &&
    !graphType.includes('DocumentChunk')
  ) {
    const entityNodes = allNodes.filter((node) => !node.labels.includes('Document') && !node.labels.includes('Chunk'));
    const communityNodes = allNodes.filter((node) => node.labels.includes('__Community__'));
    filteredNodes = [...entityNodes, ...communityNodes];
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    filteredRelations = allRelationships.filter(
      (rel) =>
        !['PART_OF', 'FIRST_CHUNK', 'SIMILAR', 'NEXT_CHUNK'].includes(rel.caption ?? '') &&
        nodeIds.has(rel.from) &&
        nodeIds.has(rel.to)
    );
    filteredScheme = {
      ...Object.fromEntries(entityTypes.map((key) => [key, scheme[key]])),
      __Community__: scheme.__Community__,
    };
    // Document + Chunk + Communities
  } else if (
    graphType.includes('DocumentChunk') &&
    graphType.includes('Communities') &&
    !graphType.includes('Entities')
  ) {
    const documentChunkNodes = allNodes.filter(
      (node) => (node.labels.includes('Document') && node.properties.fileName) || node.labels.includes('Chunk')
    );
    const communityNodes = allNodes.filter((node) => node.labels.includes('__Community__'));
    filteredNodes = [...documentChunkNodes, ...communityNodes];
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    filteredRelations = allRelationships.filter(
      (rel) =>
        ['PART_OF', 'FIRST_CHUNK', 'SIMILAR', 'NEXT_CHUNK', 'IN_COMMUNITY', 'PARENT_COMMUNITY'].includes(
          rel.caption ?? ''
        ) &&
        nodeIds.has(rel.from) &&
        nodeIds.has(rel.to)
    );
    filteredScheme = { Document: scheme.Document, Chunk: scheme.Chunk, __Community__: scheme.__Community__ };
    // Document + Chunk + Entity + Communities (All types)
  } else if (
    graphType.includes('DocumentChunk') &&
    graphType.includes('Entities') &&
    graphType.includes('Communities')
  ) {
    filteredNodes = allNodes;
    filteredRelations = allRelationships;
    filteredScheme = scheme;
  }
  return { filteredNodes, filteredRelations, filteredScheme };
};
export const getDateTime = () => {
  const date = new Date();
  const formattedDateTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  return formattedDateTime;
};

export const getIsLoading = (messages: Messages[]) => {
  return messages.some((msg) => msg.isTyping || msg.isLoading);
};
export const calculateProcessingTime = (fileSizeBytes: number, processingTimePerByteSeconds: number) => {
  const totalProcessingTimeSeconds = (fileSizeBytes / 1000) * processingTimePerByteSeconds;
  const minutes = Math.floor(totalProcessingTimeSeconds / 60);
  const seconds = Math.floor(totalProcessingTimeSeconds % 60);
  return { minutes, seconds };
};

export const capitalize = (word: string): string => {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
};
export const parseEntity = (entity: Entity) => {
  const { labels, properties } = entity;
  let [label] = labels;
  const text = properties.id;
  if (!label) {
    label = 'Entity';
  }
  return { label, text };
};

export const titleCheck = (title: string) => {
  return title === 'Chunk' || title === 'Document';
};

export const getFileSourceStatus = (item: SourceNode) => {
  if (item?.fileSource === 's3 bucket' && localStorage.getItem('accesskey') === item?.awsAccessKeyId) {
    return item?.status;
  }
  if (item?.fileSource === 'local file') {
    return item?.status;
  }
  if (item?.status === 'Completed' || item.status === 'Failed' || item.status === 'Reprocess') {
    return item?.status;
  }
  if (
    item?.fileSource === 'Wikipedia' ||
    item?.fileSource === 'youtube' ||
    item?.fileSource === 'gcs bucket' ||
    item?.fileSource === 'web-url'
  ) {
    return item?.status;
  }
  return 'N/A';
};
export const isFileCompleted = (waitingFile: CustomFile, item: SourceNode) =>
  waitingFile && item.status === 'Completed';

export const calculateProcessedCount = (prev: number, batchSize: number) =>
  (prev === batchSize ? batchSize - 1 : prev + 1);

export const isProcessingFileValid = (item: SourceNode, userCredentials: UserCredentials) => {
  return item.status === 'Processing' && item.fileName != undefined && userCredentials && userCredentials.database;
};
export const sortAlphabetically = (a: Relationship, b: Relationship) => {
  const captionOne = a.caption?.toLowerCase() || '';
  const captionTwo = b.caption?.toLowerCase() || '';
  return captionOne.localeCompare(captionTwo);
};

export const capitalizeWithPlus = (s: string) => {
  return s
    .split('+')
    .map((s) => capitalize(s))
    .join('+');
};
export const capitalizeWithUnderscore = (s: string) => capitalize(s).split('_').join(' ');

export const getDescriptionForChatMode = (mode: string): string => {
  switch (mode.toLowerCase()) {
    case chatModeLables.vector:
      return 'Utilizes vector indexing on text chunks to enable semantic similarity search.';
    case chatModeLables.graph:
      return 'Leverages text-to-cypher translation to query a database and retrieve relevant data, ensuring a highly targeted and contextually accurate response.';
    case chatModeLables['graph+vector']:
      return 'Combines vector indexing on text chunks with graph connections, enhancing search results with contextual relevance by considering relationships between concepts.';
    case chatModeLables.fulltext:
      return 'Employs a fulltext index on text chunks for rapid keyword-based search, efficiently identifying documents containing specific words or phrases.';
    case chatModeLables['graph+vector+fulltext']:
      return 'Merges vector indexing, graph connections, and fulltext indexing for a comprehensive search approach, combining semantic similarity, contextual relevance, and keyword-based search for optimal results.';
    case chatModeLables['entity search+vector']:
      return 'Combines entity node vector indexing with graph connections for accurate entity-based search, providing the most relevant response.';
    case chatModeLables['global search+vector+fulltext']:
      return 'Use vector and full-text indexing on community nodes to provide accurate, context-aware answers globally.';
    default:
      return 'Chat mode description not available'; // Fallback description
  }
};
export const getLogo = (mode: string): Record<string, string> => {
  if (mode === 'light') {
    return {
      Wikipedia: Wikipediadarkmode,
      'web-url': webdarklogo,
      's3 bucket': s3logo,
      youtube: youtubedarklogo,
      'gcs bucket': gcslogo,
    };
  }
  return {
    Wikipedia: Wikipediadlogo,
    'web-url': weblogo,
    's3 bucket': s3logo,
    youtube: youtubelightlogo,
    'gcs bucket': gcslogo,
  };
};

export const generateYouTubeLink = (url: string, startTime: string) => {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('t', startTime);
    return urlObj.toString();
  } catch (error) {
    console.error('Invalid URL:', error);
    return '';
  }
};
export function isAllowedHost(url: string, allowedHosts: string[]) {
  try {
    const parsedUrl = new URL(url);
    return allowedHosts.includes(parsedUrl.host);
  } catch (e) {
    return false;
  }
}

export const getCheckboxConditions = (allNodes: ExtendedNode[]) => {
  const isDocChunk = allNodes.some((n) => n.labels?.includes('Document') || n.labels?.includes('Chunk'));
  const isEntity = allNodes.some(
    (n) => !n.labels?.includes('Document') && !n.labels?.includes('Chunk') && !n.labels?.includes('__Community__')
  );
  const isCommunity = allNodes.some((n) => n.labels?.includes('__Community__'));
  return { isDocChunk, isEntity, isCommunity };
};

export const graphTypeFromNodes = (allNodes: ExtendedNode[]) => {
  const graphType: GraphType[] = [];
  const hasDocChunk = allNodes.some((n) => n.labels?.includes('Document') || n.labels?.includes('Chunk'));
  const hasEntity = allNodes.some(
    (n) => !n.labels?.includes('Document') && !n.labels?.includes('Chunk') && !n.labels?.includes('__Community__')
  );
  const hasCommunity = allNodes.some((n) => n.labels?.includes('__Community__'));
  if (hasDocChunk) {
    graphType.push('DocumentChunk');
  }
  if (hasEntity) {
    graphType.push('Entities');
  }
  if (hasCommunity) {
    graphType.push('Communities');
  }
  return graphType;
};
export function downloadClickHandler<Type>(
  JsonData: Type,
  downloadLinkRef: React.RefObject<HTMLAnchorElement>,
  filename: string
) {
  const textFile = new Blob([JSON.stringify(JsonData)], { type: 'application/json' });
  if (downloadLinkRef && downloadLinkRef.current) {
    downloadLinkRef.current.href = URL.createObjectURL(textFile);
    downloadLinkRef.current.download = filename;
    downloadLinkRef.current.click();
  }
}
export function getNodes<Type extends Entity | ExtendedNode>(nodesData: Array<Type>, mode: string) {
  return nodesData.map((n) => {
    if (!n.labels.length && mode === chatModeLables['entity search+vector']) {
      return {
        ...n,
        labels: ['Entity'],
      };
    }
    return n;
  });
}
