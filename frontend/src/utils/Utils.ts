import { calcWordColor } from '@neo4j-devtools/word-color';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { Messages, Scheme } from '../types';

// Get the Url
export const url = () => {
  let url = window.location.href.replace('5173', '8000');
  if (process.env.BACKEND_API_URL) {
    url = process.env.BACKEND_API_URL;
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
  const encodedFileName = splitUrl[splitUrl.length - 1].split('?')[0];
  const decodedFileName = decodeURIComponent(encodedFileName);
  if (decodedFileName.includes('/')) {
    const splitedstr = decodedFileName.split('/');
    return splitedstr[splitedstr.length - 1];
  }
  return decodedFileName;
}

export const processGraphData = (neoNodes: Node[], neoRels: Relationship[]) => {
  const schemeVal: Scheme = {};
  let iterator = 0;
  const labels: string[] = neoNodes.map((f: any) => f.labels);
  labels.forEach((label: any) => {
    if (schemeVal[label] == undefined) {
      schemeVal[label] = calcWordColor(label[0]);
      iterator += 1;
    }
  });
  const newNodes: Node[] = neoNodes.map((g: any) => {
    return {
      id: g.element_id,
      size: getSize(g),
      captionAlign: 'bottom',
      iconAlign: 'bottom',
      caption: getNodeCaption(g),
      color: schemeVal[g.labels[0]],
      icon: getIcon(g),
      labels: g.labels,
    };
  });
  const finalNodes = newNodes.flat();
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

export const getDateTime = () => {
  const date = new Date();
  const formattedDateTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  return formattedDateTime;
};

export const getIsLoading = (messages: Messages[]) => {
  return messages.some((msg) => msg.isTyping || msg.isLoading);
};
