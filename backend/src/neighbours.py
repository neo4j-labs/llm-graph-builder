import logging
from src.graph_query import *

NEIGHBOURS_FROM_ELEMENT_ID_QUERY = """
MATCH (n) 
WHERE elementId(n) = $element_id

MATCH (n)<-[rels]->(m)  
WITH n, ([n]+ COLLECT(DISTINCT m)) AS allNodes, COLLECT(DISTINCT rels) AS allRels

WITH n, allNodes, allRels,
     apoc.map.fromPairs(
         [node IN allNodes | [elementId(node), 
           node {
               .*,
               embedding: null,
               text: null,
               summary: null,
               labels: [coalesce(apoc.coll.removeAll(labels(node), ['__Entity__'])[0], "*")],
               elementId: elementId(node)
           }]
         ]
     ) AS nodeMap
RETURN 
    [node IN allNodes | nodeMap[elementId(node)]] AS nodes,
    [r IN allRels | 
        {
            startNode: apoc.map.merge(nodeMap[elementId(startNode(r))] , {
                properties: { 
                    id: coalesce(startNode(r).id, NULL), 
                    description: coalesce(startNode(r).description, NULL)
                }
            }), 
            endNode: apoc.map.merge(nodeMap[elementId(endNode(r))] , {
                properties: { 
                    id: coalesce(endNode(r).id, NULL), 
                    description: coalesce(endNode(r).description, NULL)
                }
            }), 
            relationship: { 
                type: type(r), 
                element_id: elementId(r) 
            }
        }
    ] AS relationships
"""


def get_neighbour_nodes(uri, username, password, database, element_id, query=NEIGHBOURS_FROM_ELEMENT_ID_QUERY):
    driver = None

    try:
        logging.info(f"Querying neighbours for element_id: {element_id}")
        driver = get_graphDB_driver(uri, username, password, database)
        driver.verify_connectivity()
        logging.info("Database connectivity verified.")

        records, summary, keys = driver.execute_query(query,element_id=element_id)
        nodes = records[0].get("nodes", [])
        relationships = records[0].get("relationships", [])
        result = {"nodes": nodes, "relationships": relationships}
        
        logging.info(f"Successfully retrieved neighbours for element_id: {element_id}")
        return result
    
    except Exception as e:
        logging.error(f"Error retrieving neighbours for element_id: {element_id}: {e}")
        return {"nodes": [], "relationships": []}
    
    finally:
        if driver is not None:
            driver.close()
            logging.info("Database driver closed.")