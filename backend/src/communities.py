import logging
from graphdatascience import GraphDataScience
from src.llm import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser 
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
from src.shared.common_fn import load_embedding_model


COMMUNITY_PROJECTION_NAME = "communities"
NODE_PROJECTION = "!Chunk&!Document&!__Community__"
NODE_PROJECTION_ENTITY = "__Entity__"
MAX_WORKERS = 10
MAX_COMMUNITY_LEVELS = 3 
MIN_COMMUNITY_SIZE = 1 
COMMUNITY_CREATION_DEFAULT_MODEL = "openai_gpt_4o"


CREATE_COMMUNITY_GRAPH_PROJECTION = """
MATCH (source:{node_projection})-[]->(target:{node_projection})
WITH source, target, count(*) as weight
WITH gds.graph.project(
               '{project_name}',
               source,
               target,
               {{
               relationshipProperties: {{ weight: weight }}
               }},
               {{undirectedRelationshipTypes: ['*']}}
               ) AS g
RETURN
  g.graphName AS graph_name, g.nodeCount AS nodes, g.relationshipCount AS rels
"""

CREATE_COMMUNITY_CONSTRAINT = "CREATE CONSTRAINT IF NOT EXISTS FOR (c:__Community__) REQUIRE c.id IS UNIQUE;"
CREATE_COMMUNITY_LEVELS = """
MATCH (e:`__Entity__`)
WHERE e.communities is NOT NULL
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
  MERGE (previous)-[:PARENT_COMMUNITY]->(current)
  RETURN count(*) AS count_1
}
RETURN count(*)
"""
CREATE_COMMUNITY_RANKS = """
MATCH (c:__Community__)<-[:IN_COMMUNITY*]-(:!Chunk&!Document&!__Community__)<-[HAS_ENTITY]-(:Chunk)<-[]-(d:Document)
WITH c, count(distinct d) AS rank
SET c.community_rank = rank;
"""

CREATE_PARENT_COMMUNITY_RANKS = """
MATCH (c:__Community__)<-[:PARENT_COMMUNITY*]-(:__Community__)<-[:IN_COMMUNITY*]-(:!Chunk&!Document&!__Community__)<-[HAS_ENTITY]-(:Chunk)<-[]-(d:Document)
WITH c, count(distinct d) AS rank
SET c.community_rank = rank;
"""

CREATE_COMMUNITY_WEIGHTS = """
MATCH (n:`__Community__`)<-[:IN_COMMUNITY]-()<-[:HAS_ENTITY]-(c)
WITH n, count(distinct c) AS chunkCount
SET n.weight = chunkCount
"""
CREATE_PARENT_COMMUNITY_WEIGHTS = """
MATCH (n:`__Community__`)<-[:PARENT_COMMUNITY*]-(:`__Community__`)<-[:IN_COMMUNITY]-()<-[:HAS_ENTITY]-(c)
WITH n, count(distinct c) AS chunkCount
SET n.weight = chunkCount
"""

GET_COMMUNITY_INFO = """
MATCH (c:`__Community__`)<-[:IN_COMMUNITY]-(e)
WHERE c.level = 0
WITH c, collect(e) AS nodes
WHERE size(nodes) > 1
CALL apoc.path.subgraphAll(nodes[0], {
	whitelistNodes:nodes
})
YIELD relationships
RETURN c.id AS communityId,
       [n in nodes | {id: n.id, description: n.description, type: [el in labels(n) WHERE el <> '__Entity__'][0]}] AS nodes,
       [r in relationships | {start: startNode(r).id, type: type(r), end: endNode(r).id}] AS rels
"""

GET_PARENT_COMMUNITY_INFO = """
MATCH (p:`__Community__`)<-[:PARENT_COMMUNITY*]-(c:`__Community__`)
WHERE p.summary is null and c.summary is not null
RETURN p.id as communityId, collect(c.summary) as texts
"""


STORE_COMMUNITY_SUMMARIES = """
UNWIND $data AS row
MERGE (c:__Community__ {id:row.community})
SET c.summary = row.summary,
    c.title = row.title
""" 


COMMUNITY_SYSTEM_TEMPLATE = "Given input triples, generate the information summary. No pre-amble."


COMMUNITY_TEMPLATE = """
Based on the provided nodes and relationships that belong to the same graph community,
generate following output in exact format
title: A concise title, no more than 4 words,
summary: A natural language summary of the information
{community_info}
Example output:
title: Example Title,
summary: This is an example summary that describes the key information of this community.
"""

PARENT_COMMUNITY_SYSTEM_TEMPLATE = "Given an input list of community summaries, generate a summary of the information"

PARENT_COMMUNITY_TEMPLATE = """Based on the provided list of community summaries that belong to the same graph community, 
generate following output in exact format
title: A concise title, no more than 4 words,
summary: A natural language summary of the information. Include all the necessary information as much as possible.

{community_info}

Example output:
title: Example Title,
summary: This is an example summary that describes the key information of this community.
""" 


GET_COMMUNITY_DETAILS = """
MATCH (c:`__Community__`)
WHERE  c.embedding IS NULL AND c.summary IS NOT NULL
RETURN c.id as communityId, c.summary as text
"""

WRITE_COMMUNITY_EMBEDDINGS = """
UNWIND $rows AS row
MATCH (c) WHERE c.id = row.communityId
CALL db.create.setNodeVectorProperty(c, "embedding", row.embedding)
"""  

DROP_COMMUNITIES = "MATCH (c:`__Community__`) DETACH DELETE c"
DROP_COMMUNITY_PROPERTY = "MATCH (e:`__Entity__`) REMOVE e.communities"


ENTITY_VECTOR_INDEX_NAME = "entity_vector"
ENTITY_VECTOR_EMBEDDING_DIMENSION = 384

DROP_ENTITY_VECTOR_INDEX_QUERY = f"DROP INDEX {ENTITY_VECTOR_INDEX_NAME} IF EXISTS;"
CREATE_ENTITY_VECTOR_INDEX_QUERY = """
CREATE VECTOR INDEX {index_name} IF NOT EXISTS FOR (e:__Entity__) ON e.embedding
OPTIONS {{
  indexConfig: {{
    `vector.dimensions`: {embedding_dimension},
    `vector.similarity_function`: 'cosine'
  }}
}}
""" 

COMMUNITY_VECTOR_INDEX_NAME = "community_vector"
COMMUNITY_VECTOR_EMBEDDING_DIMENSION = 384

DROP_COMMUNITY_VECTOR_INDEX_QUERY = f"DROP INDEX {COMMUNITY_VECTOR_INDEX_NAME} IF EXISTS;"
CREATE_COMMUNITY_VECTOR_INDEX_QUERY = """
CREATE VECTOR INDEX {index_name} IF NOT EXISTS FOR (c:__Community__) ON c.embedding
OPTIONS {{
  indexConfig: {{
    `vector.dimensions`: {embedding_dimension},
    `vector.similarity_function`: 'cosine'
  }}
}}
""" 

COMMUNITY_FULLTEXT_INDEX_NAME = "community_keyword"
COMMUNITY_FULLTEXT_INDEX_DROP_QUERY = f"DROP INDEX  {COMMUNITY_FULLTEXT_INDEX_NAME} IF EXISTS;"
COMMUNITY_INDEX_FULL_TEXT_QUERY = f"CREATE FULLTEXT INDEX {COMMUNITY_FULLTEXT_INDEX_NAME} FOR (n:`__Community__`) ON EACH [n.summary]" 



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

def create_community_graph_projection(gds, project_name=COMMUNITY_PROJECTION_NAME, node_projection=NODE_PROJECTION):
    try:
        existing_projects = gds.graph.list()
        project_exists = existing_projects["graphName"].str.contains(project_name, regex=False).any()
        
        if project_exists:
            logging.info(f"Projection '{project_name}' already exists. Dropping it.")
            gds.graph.drop(project_name)
        
        logging.info(f"Creating new graph project '{project_name}'.")
        projection_query = CREATE_COMMUNITY_GRAPH_PROJECTION.format(node_projection=node_projection,project_name=project_name)
        graph_projection_result = gds.run_cypher(projection_query)
        projection_result = graph_projection_result.to_dict(orient="records")[0]
        logging.info(f"Graph projection '{projection_result['graph_name']}' created successfully with {projection_result['nodes']} nodes and {projection_result['rels']} relationships.")
        graph_project = gds.graph.get(projection_result['graph_name'])
        return graph_project
    except Exception as e:
        logging.error(f"Failed to create community graph project: {e}")
        raise

def write_communities(gds, graph_project, project_name=COMMUNITY_PROJECTION_NAME):
    try:
        logging.info(f"Writing communities to the graph project '{project_name}'.")
        gds.leiden.write(
            graph_project,
            writeProperty=project_name,
            includeIntermediateCommunities=True,
            relationshipWeightProperty="weight",
            maxLevels=MAX_COMMUNITY_LEVELS,
            minCommunitySize=MIN_COMMUNITY_SIZE,
        )
        logging.info("Communities written successfully.")
        return True
    except Exception as e:
        logging.error(f"Failed to write communities: {e}")
        return False


def get_community_chain(model, is_parent=False,community_template=COMMUNITY_TEMPLATE,system_template=COMMUNITY_SYSTEM_TEMPLATE):
    try:
        if is_parent:
            community_template=PARENT_COMMUNITY_TEMPLATE
            system_template= PARENT_COMMUNITY_SYSTEM_TEMPLATE
        llm, model_name = get_llm(model)
        community_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    system_template,
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

def process_community_info(community, chain, is_parent=False):
    try:
        if is_parent:
            combined_text = " ".join(f"Summary {i+1}: {summary}" for i, summary in enumerate(community.get("texts", [])))
        else:
            combined_text = prepare_string(community)
        summary_response = chain.invoke({'community_info': combined_text})
        lines = summary_response.splitlines()
        title = "Untitled Community"
        summary = ""
        for line in lines:
            if line.lower().startswith("title"):
                title = line.split(":", 1)[-1].strip()
            elif line.lower().startswith("summary"):
                summary = line.split(":", 1)[-1].strip()     
        logging.info(f"Community Title : {title}")
        return {"community": community['communityId'], "title":title, "summary": summary}
    except Exception as e:
        logging.error(f"Failed to process community {community.get('communityId', 'unknown')}: {e}")
        return None

def create_community_summaries(gds, model):
    try:
        community_info_list = gds.run_cypher(GET_COMMUNITY_INFO)
        community_chain = get_community_chain(model)

        summaries = []
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(process_community_info, community, community_chain) for community in community_info_list.to_dict(orient="records")]
   
            for future in as_completed(futures):
                result = future.result()
                if result:
                    summaries.append(result)
                else:
                    logging.error("community summaries could not be processed.")

        gds.run_cypher(STORE_COMMUNITY_SUMMARIES, params={"data": summaries})

        parent_community_info = gds.run_cypher(GET_PARENT_COMMUNITY_INFO)
        parent_community_chain = get_community_chain(model, is_parent=True)

        parent_summaries = []
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(process_community_info, community, parent_community_chain, is_parent=True) for community in parent_community_info.to_dict(orient="records")]
            
            for future in as_completed(futures):
                result = future.result()
                if result:
                    parent_summaries.append(result)
                else:
                    logging.error("parent community summaries could not be processed.")

        gds.run_cypher(STORE_COMMUNITY_SUMMARIES, params={"data": parent_summaries})

    except Exception as e:
        logging.error(f"Failed to create community summaries: {e}")
        raise

def create_community_embeddings(gds):
    try:
        embedding_model = os.getenv('EMBEDDING_MODEL')
        embeddings, dimension = load_embedding_model(embedding_model)
        logging.info(f"Embedding model '{embedding_model}' loaded successfully.")
        
        logging.info("Fetching community details.")
        rows = gds.run_cypher(GET_COMMUNITY_DETAILS)
        rows = rows[['communityId', 'text']].to_dict(orient='records')
        logging.info(f"Fetched {len(rows)} communities.")
        
        batch_size = 100
        for i in range(0, len(rows), batch_size):
            batch_rows = rows[i:i+batch_size]            
            for row in batch_rows:
                try:
                    row['embedding'] = embeddings.embed_query(row['text'])
                except Exception as e:
                    logging.error(f"Failed to embed text for community ID {row['communityId']}: {e}")
                    row['embedding'] = None
            
            try:
                logging.info("Writing embeddings to the database.")
                gds.run_cypher(WRITE_COMMUNITY_EMBEDDINGS, params={'rows': batch_rows})
                logging.info("Embeddings written successfully.")
            except Exception as e:
                logging.error(f"Failed to write embeddings to the database: {e}")
                continue
        return dimension
    except Exception as e:
        logging.error(f"An error occurred during the community embedding process: {e}")


def create_vector_index(gds, index_type,embedding_dimension=None):
    drop_query = ""
    query = ""
    
    if index_type == ENTITY_VECTOR_INDEX_NAME:
        drop_query = DROP_ENTITY_VECTOR_INDEX_QUERY
        query = CREATE_ENTITY_VECTOR_INDEX_QUERY.format(
            index_name=ENTITY_VECTOR_INDEX_NAME,
            embedding_dimension=embedding_dimension if embedding_dimension else ENTITY_VECTOR_EMBEDDING_DIMENSION
        )
    elif index_type == COMMUNITY_VECTOR_INDEX_NAME:
        drop_query = DROP_COMMUNITY_VECTOR_INDEX_QUERY
        query = CREATE_COMMUNITY_VECTOR_INDEX_QUERY.format(
            index_name=COMMUNITY_VECTOR_INDEX_NAME,
            embedding_dimension=embedding_dimension if embedding_dimension else COMMUNITY_VECTOR_EMBEDDING_DIMENSION
        )
    else:
        logging.error(f"Invalid index type provided: {index_type}")
        return

    try:
        logging.info("Starting the process to create vector index.")

        logging.info(f"Executing drop query: {drop_query}")
        gds.run_cypher(drop_query)

        logging.info(f"Executing create query: {query}")
        gds.run_cypher(query)

        logging.info(f"Vector index '{index_type}' created successfully.")
    
    except Exception as e:
        logging.error("An error occurred while creating the vector index.", exc_info=True)
        logging.error(f"Error details: {str(e)}")


def create_fulltext_index(gds, index_type):
    drop_query = ""
    query = ""
    
    if index_type == COMMUNITY_FULLTEXT_INDEX_NAME:
        drop_query = COMMUNITY_FULLTEXT_INDEX_DROP_QUERY
        query = COMMUNITY_INDEX_FULL_TEXT_QUERY
    else:
        logging.error(f"Invalid index type provided: {index_type}")
        return

    try:
        logging.info("Starting the process to create full-text index.")

        logging.info(f"Executing drop query: {drop_query}")
        gds.run_cypher(drop_query)

        logging.info(f"Executing create query: {query}")
        gds.run_cypher(query)

        logging.info(f"Full-text index '{index_type}' created successfully.")

    except Exception as e:
        logging.error("An error occurred while creating the full-text index.", exc_info=True)
        logging.error(f"Error details: {str(e)}")

def create_community_properties(gds, model):
    commands = [
        (CREATE_COMMUNITY_CONSTRAINT, "created community constraint to the graph."),
        (CREATE_COMMUNITY_LEVELS, "Successfully created community levels."),
        (CREATE_COMMUNITY_RANKS, "Successfully created community ranks."),
        (CREATE_PARENT_COMMUNITY_RANKS, "Successfully created parent community ranks."),
        (CREATE_COMMUNITY_WEIGHTS, "Successfully created community weights."),
        (CREATE_PARENT_COMMUNITY_WEIGHTS, "Successfully created parent community weights."),
    ]
    try:
        for command, message in commands:
            gds.run_cypher(command)
            logging.info(message)

        create_community_summaries(gds, model)
        logging.info("Successfully created community summaries.")

        embedding_dimension = create_community_embeddings(gds)
        logging.info("Successfully created community embeddings.")

        create_vector_index(gds=gds,index_type=ENTITY_VECTOR_INDEX_NAME,embedding_dimension=embedding_dimension)
        logging.info("Successfully created Entity Vector Index.")

        create_vector_index(gds=gds,index_type=COMMUNITY_VECTOR_INDEX_NAME,embedding_dimension=embedding_dimension)
        logging.info("Successfully created community Vector Index.")

        create_fulltext_index(gds=gds,index_type=COMMUNITY_FULLTEXT_INDEX_NAME)
        logging.info("Successfully created community fulltext Index.")

    except Exception as e:
        logging.error(f"Error during community properties creation: {e}")
        raise


def clear_communities(gds):
    try:
        logging.info("Starting to clear communities.")

        logging.info("Dropping communities...")
        gds.run_cypher(DROP_COMMUNITIES)
        logging.info(f"Communities dropped successfully")

        logging.info("Dropping community property from entities...")
        gds.run_cypher(DROP_COMMUNITY_PROPERTY)
        logging.info(f"Community property dropped successfully")

    except Exception as e:
        logging.error(f"An error occurred while clearing communities: {e}")
        raise


def create_communities(uri, username, password, database,model=COMMUNITY_CREATION_DEFAULT_MODEL):
    try:
        gds = get_gds_driver(uri, username, password, database)
        clear_communities(gds)

        graph_project = create_community_graph_projection(gds)
        write_communities_sucess = write_communities(gds, graph_project)
        if write_communities_sucess:
            logging.info("Starting Community properties creation process.")
            create_community_properties(gds,model)
            logging.info("Communities creation process completed successfully.")
        else:
            logging.warning("Failed to write communities. Constraint was not applied.")
    except Exception as e:
        logging.error(f"Failed to create communities: {e}")
