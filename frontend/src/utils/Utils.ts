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

export const constructQuery = (queryTochange: string, docLimit: string) => {
  return `MATCH docs = (d:Document {status:'Completed'}) 
  WITH docs, d ORDER BY d.createdAt DESC 
  LIMIT ${docLimit}
  OPTIONAL MATCH chunks=(d)<-[:PART_OF]-(c:Chunk)
  WITH * LIMIT 100
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
OPTIONAL MATCH chunks=(d)<-[:PART_OF]-(c:Chunk)
WITH * LIMIT 100
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
