import axios from "axios";

//TO-DO from env
const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 150000,
});

interface ConnectionParams {
  uri: string;
  userName: string;
  password: string;
  database: string;
}

export const graphQueryAPI = async (
  query_type: string,
  document_names: (string | undefined)[] | undefined,
  signal: AbortSignal,
  connectionParams?: ConnectionParams
) => {
  try {
    console.log("Making API call with params:", {
      query_type,
      document_names,
      connectionParams: connectionParams
        ? {
            uri: connectionParams.uri,
            userName: connectionParams.userName,
            database: connectionParams.database,
            password: "***", //hide pass
          }
        : "none",
    });

    const formData = new FormData();
    formData.append("query_type", query_type ?? "entities");
    formData.append("document_names", JSON.stringify(document_names));

    if (connectionParams) {
      formData.append("uri", connectionParams.uri);
      formData.append("userName", connectionParams.userName);
      formData.append("password", connectionParams.password);
      formData.append("database", connectionParams.database);
    }

    // console.log("Sending request to:", `${API_BASE_URL}/graph_query`);
    // console.log("FormData contents:");
    // for (const [key, value] of formData.entries()) {
    //   console.log(`${key}:`, key === "password" ? "***" : value);
    // }

    const response = await api.post(`/graph_query`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
    });
    return response;
  } catch (error: any) {
    console.error("Error getting the Nodes or Relationships:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The backend is taking too long to respond. Please check if your backend is running and try again."
      );
    } else if (error.response) {
      throw new Error(
        `Backend error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`
      );
    } else if (error.request) {
      throw new Error(
        "No response from backend. Please check if your backend is running"
      );
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

export const getNeighbors = async (elementId: string) => {
  try {
    const formData = new FormData();
    formData.append("elementId", elementId);

    const response = await api.post(`/get_neighbours`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    console.log("Error getting the Neighbors:", error);
    throw error;
  }
};

export const getGraphSchema = async () => {
  try {
    const formData = new FormData();
    const response = await api.post(`/schema_visualization`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    console.log("Error getting the Schema:", error);
    throw error;
  }
};

// Data transformation functions to convert backend format to frontend format
export const transformBackendData = (backendData: any) => {
  console.log("Backend response structure:", backendData);

  // Handle different possible response structures
  let nodes, relationships;

  if (backendData.data && backendData.data.data) {
    // Expected structure: { data: { data: { nodes: [], relationships: [] } } }
    nodes = backendData.data.data.nodes || [];
    relationships = backendData.data.data.relationships || [];
  } else if (backendData.data) {
    // Alternative structure: { data: { nodes: [], relationships: [] } }
    nodes = backendData.data.nodes || [];
    relationships = backendData.data.relationships || [];
  } else {
    // Direct structure: { nodes: [], relationships: [] }
    nodes = backendData.nodes || [];
    relationships = backendData.relationships || [];
  }

  // Transform nodes
  const transformedNodes = nodes.map((node: any) => ({
    id: node.element_id,
    labels: node.labels || [],
    properties: node.properties || {},
  }));

  // Transform relationships
  const transformedRelationships = relationships.map((rel: any) => ({
    id: rel.element_id,
    from: rel.start_node_element_id,
    to: rel.end_node_element_id,
    type: rel.type,
    properties: rel.properties || {},
  }));

  return {
    nodes: transformedNodes,
    relationships: transformedRelationships,
  };
};

// Enhanced graph query with data transformation
export const graphQueryAPIWithTransform = async (
  query_type: string,
  document_names: (string | undefined)[] | undefined,
  signal: AbortSignal,
  connectionParams?: ConnectionParams
) => {
  try {
    const response = await graphQueryAPI(
      query_type,
      document_names,
      signal,
      connectionParams
    );
    //console.log("Raw API response:", response);
    const transformedData = transformBackendData(response);
    return {
      ...response,
      data: {
        ...response.data,
        data: transformedData,
      },
    };
  } catch (error) {
    console.log("Error in graphQueryAPIWithTransform:", error);
    throw error;
  }
};

export const searchNodesAPI = async (
  search_term: string,
  node_type: string = "Person",
  max_results: number = 50,
  signal: AbortSignal,
  connectionParams?: ConnectionParams
) => {
  try {
    console.log("Making search API call with params:", {
      search_term,
      node_type,
      max_results,
      connectionParams: connectionParams
        ? {
            uri: connectionParams.uri,
            userName: connectionParams.userName,
            database: connectionParams.database,
            password: "***", //hide pass
          }
        : "none",
    });

    const formData = new FormData();
    formData.append("search_term", search_term);
    formData.append("node_type", node_type);
    formData.append("max_results", max_results.toString());

    if (connectionParams) {
      formData.append("uri", connectionParams.uri);
      formData.append("userName", connectionParams.userName);
      formData.append("password", connectionParams.password);
      formData.append("database", connectionParams.database);
    }

    const response = await api.post(`/search_nodes`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
    });
    return response;
  } catch (error: any) {
    console.error("Error searching nodes:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The backend is taking too long to respond. Please check if your backend is running and try again."
      );
    } else if (error.response) {
      throw new Error(
        `Backend error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`
      );
    } else if (error.request) {
      throw new Error(
        "No response from backend. Please check if your backend is running"
      );
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

export const getSubgraphAPI = async (
  node_id: string,
  depth: number = 4,
  max_nodes: number = 1000,
  signal: AbortSignal,
  connectionParams?: ConnectionParams
) => {
  try {
    console.log("Making subgraph API call with params:", {
      node_id,
      depth,
      max_nodes,
      connectionParams: connectionParams
        ? {
            uri: connectionParams.uri,
            userName: connectionParams.userName,
            database: connectionParams.database,
            password: "***", //hide pass
          }
        : "none",
    });

    const formData = new FormData();
    formData.append("node_id", node_id);
    formData.append("depth", depth.toString());
    formData.append("max_nodes", max_nodes.toString());

    if (connectionParams) {
      formData.append("uri", connectionParams.uri);
      formData.append("userName", connectionParams.userName);
      formData.append("password", connectionParams.password);
      formData.append("database", connectionParams.database);
    }

    const response = await api.post(`/get_subgraph`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
    });
    return response;
  } catch (error: any) {
    console.error("Error getting subgraph:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The backend is taking too long to respond. Please check if your backend is running and try again."
      );
    } else if (error.response) {
      throw new Error(
        `Backend error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`
      );
    } else if (error.request) {
      throw new Error(
        "No response from backend. Please check if your backend is running"
      );
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

export const searchAndGetSubgraphAPI = async (
  search_term: string,
  node_type: string = "Person",
  depth: number = 4,
  max_results: number = 10,
  signal: AbortSignal,
  connectionParams?: ConnectionParams
) => {
  try {
    console.log("Making search and subgraph API call with params:", {
      search_term,
      node_type,
      depth,
      max_results,
      connectionParams: connectionParams
        ? {
            uri: connectionParams.uri,
            userName: connectionParams.userName,
            database: connectionParams.database,
            password: "***", //hide pass
          }
        : "none",
    });

    const formData = new FormData();
    formData.append("search_term", search_term);
    formData.append("node_type", node_type);
    formData.append("depth", depth.toString());
    formData.append("max_results", max_results.toString());

    if (connectionParams) {
      formData.append("uri", connectionParams.uri);
      formData.append("userName", connectionParams.userName);
      formData.append("password", connectionParams.password);
      formData.append("database", connectionParams.database);
    }

    const response = await api.post(`/search_and_get_subgraph`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
    });
    return response;
  } catch (error: any) {
    console.error("Error searching and getting subgraph:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The backend is taking too long to respond. Please check if your backend is running and try again."
      );
    } else if (error.response) {
      throw new Error(
        `Backend error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`
      );
    } else if (error.request) {
      throw new Error(
        "No response from backend. Please check if your backend is running"
      );
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};
