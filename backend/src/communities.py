import logging
from graphdatascience import GraphDataScience
from src.llm import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser 
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm 


COMMUNITY_PROJECT_NAME = "communities"
NODE_PROJECTION = "__Entity__"
MAX_WORKERS = 10

CREATE_COMMUNITY_CONSTRAINT = "CREATE CONSTRAINT IF NOT EXISTS FOR (c:__Community__) REQUIRE c.id IS UNIQUE;"
CREATE_COMMUNITY_LEVELS = """
MATCH (e:`__Entity__`)
UNWIND range(0, size(e.communities) - 1 , 1) AS index
CALL {
  WITH e, index
  WITH e, index
  WHERE index = 0
  MERGE (c:`__Community__` {id: toString(index) + '-' + toString(e.communities[index])})
  ON CREATE SET c.level = index
  MERGE (e)-[:IN_COMMUNITY]->(c)
  RETURN count(*) AS count_0
}
CALL {
  WITH e, index
  WITH e, index
  WHERE index > 0
  MERGE (current:`__Community__` {id: toString(index) + '-' + toString(e.communities[index])})
  ON CREATE SET current.level = index
  MERGE (previous:`__Community__` {id: toString(index - 1) + '-' + toString(e.communities[index - 1])})
  ON CREATE SET previous.level = index - 1
  MERGE (previous)-[:IN_COMMUNITY]->(current)
  RETURN count(*) AS count_1
}
RETURN count(*)
"""
CREATE_COMMUNITY_RANKS = """
MATCH (c:__Community__)<-[:IN_COMMUNITY*]-(:__Entity__)<-[:MENTIONS]-(d:Document)
WITH c, count(distinct d) AS rank
SET c.community_rank = rank;
"""

CREATE_COMMUNITY_WEIGHTS = """
MATCH (n:`__Community__`)<-[:IN_COMMUNITY]-()<-[:HAS_ENTITY]-(c)
WITH n, count(distinct c) AS chunkCount
SET n.weight = chunkCount"""

GET_COMMUNITY_INFO = """
MATCH (c:`__Community__`)<-[:IN_COMMUNITY*]-(e:__Entity__)
WHERE c.level IN [0,1,4]
WITH c, collect(e ) AS nodes
WHERE size(nodes) > 1
CALL apoc.path.subgraphAll(nodes[0], {
	whitelistNodes:nodes
})
YIELD relationships
RETURN c.id AS communityId,
       [n in nodes | {id: n.id, description: n.description, type: [el in labels(n) WHERE el <> '__Entity__'][0]}] AS nodes,
       [r in relationships | {start: startNode(r).id, type: type(r), end: endNode(r).id, description: r.description}] AS rels
"""

STORE_COMMUNITY_SUMMARIES = """
UNWIND $data AS row
MERGE (c:__Community__ {id:row.community})
SET c.summary = row.summary
""" 

COMMUNITY_TEMPLATE = """Based on the provided nodes and relationships that belong to the same graph community,
generate a natural language summary of the provided information:
{community_info}

Summary:"""  



def get_gds_driver(uri, username, password, database):
    try:
        gds = GraphDataScience(
            endpoint=uri,
            auth=(username, password),
            database=database
        )
        logging.info("Successfully created GDS driver.")
        return gds
    except Exception as e:
        logging.error(f"Failed to create GDS driver: {e}")
        raise

def create_community_graph_project(gds, project_name=COMMUNITY_PROJECT_NAME, node_projection=NODE_PROJECTION):
    try:
        existing_projects = gds.graph.list()
        project_exists = existing_projects["graphName"].str.contains(project_name, regex=False).any()
        
        if project_exists:
            logging.info(f"Project '{project_name}' already exists. Dropping it.")
            gds.graph.drop(project_name)
        
        logging.info(f"Creating new graph project '{project_name}'.")
        graph_project, result = gds.graph.project(
            project_name, 
            node_projection,
            {
                "_ALL_": {
                    "type": "*",
                    "orientation": "UNDIRECTED",
                    "properties": {
                        "weight": {
                            "property": "*", 
                            "aggregation": "COUNT"
                        }
                    }
                }
            }
        )
        logging.info(f"Graph project '{project_name}' created successfully.")
        return graph_project, result
    except Exception as e:
        logging.error(f"Failed to create community graph project: {e}")
        raise

def write_communities(gds, graph_project, project_name=COMMUNITY_PROJECT_NAME):
    try:
        logging.info(f"Writing communities to the graph project '{project_name}'.")
        gds.leiden.write(
            graph_project,
            writeProperty=project_name,
            includeIntermediateCommunities=True,
            relationshipWeightProperty="weight"
        )
        logging.info("Communities written successfully.")
        return True
    except Exception as e:
        logging.error(f"Failed to write communities: {e}")
        return False


def get_community_chain(model, community_template=COMMUNITY_TEMPLATE):
    try:
        llm, model_name = get_llm(model)
        community_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Given input triples, generate the information summary. No pre-amble.",
                ),
                ("human", community_template),
            ]
        )

        community_chain = community_prompt | llm | StrOutputParser()
        return community_chain
    except Exception as e:
        logging.error(f"Failed to create community chain: {e}")
        raise

def prepare_string(community_data):
    try:
        nodes_description = "Nodes are:\n"
        for node in community_data['nodes']:
            node_id = node['id']
            node_type = node['type']
            node_description = f", description: {node['description']}" if 'description' in node and node['description'] else ""
            nodes_description += f"id: {node_id}, type: {node_type}{node_description}\n"

        relationships_description = "Relationships are:\n"
        for rel in community_data['rels']:
            start_node = rel['start']
            end_node = rel['end']
            relationship_type = rel['type']
            relationship_description = f", description: {rel['description']}" if 'description' in rel and rel['description'] else ""
            relationships_description += f"({start_node})-[:{relationship_type}]->({end_node}){relationship_description}\n"
        return nodes_description + "\n" + relationships_description
    except Exception as e:
        logging.error(f"Failed to prepare string from community data: {e}")
        raise

def process_community(community, community_chain):
    try:
        formatted_community_info = prepare_string(community)
        summary = community_chain.invoke({'community_info': formatted_community_info})
        return {"community": community['communityId'], "summary": summary}
    except Exception as e:
        logging.error(f"Failed to process community {community.get('communityId', 'unknown')}: {e}")
        raise

def create_community_summaries(graph, model):
    try:
        community_info_list = graph.query(GET_COMMUNITY_INFO)
        community_chain = get_community_chain(model)
        
        summaries = []
        with ThreadPoolExecutor() as executor:
            futures = {executor.submit(process_community, community, community_chain): community for community in community_info_list}

            for future in tqdm(as_completed(futures), total=len(futures), desc="Processing communities"):
                try:
                    summaries.append(future.result())
                except Exception as e:
                    logging.error(f"Failed to retrieve result for a community: {e}")

        graph.query(STORE_COMMUNITY_SUMMARIES, params={"data": summaries})
    except Exception as e:
        logging.error(f"Failed to create community summaries: {e}")
        raise


def create_community_properties(graph, model):
    try:
        # Create community levels
        graph.query(CREATE_COMMUNITY_LEVELS)
        logging.info("Successfully created community levels.")

        # Create community ranks
        graph.query(CREATE_COMMUNITY_RANKS)
        logging.info("Successfully created community ranks.")

        # Create community weights
        graph.query(CREATE_COMMUNITY_WEIGHTS)
        logging.info("Successfully created community weights.")

        # Create community summaries
        create_community_summaries(graph, model)
        logging.info("Successfully created community summaries.")
    except Exception as e:
        logging.error(f"Failed to create community properties: {e}")
        raise

def create_communities(uri, username, password, database,graph,model):
    try:
        gds = get_gds_driver(uri, username, password, database)
        graph_project, result = create_community_graph_project(gds)
        write_communities_sucess = write_communities(gds, graph_project)
        if write_communities_sucess:
            logging.info("Applying community constraint to the graph.")
            graph.query(CREATE_COMMUNITY_CONSTRAINT)
            create_community_properties(graph,model)
            logging.info("Communities creation process completed successfully.")
        else:
            logging.warning("Failed to write communities. Constraint was not applied.")
    except Exception as e:
        logging.error(f"Failed to create communities: {e}")






