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


def get_neighbour_nodes(graph, element_id, query=NEIGHBOURS_FROM_ELEMENT_ID_QUERY):
    param = {"element_id": element_id}
    try:
        logging.info(f"Querying neighbours for element_id: {element_id}")
        result = graph.query(query, param)
        logging.info(f"Successfully retrieved neighbours for element_id: {element_id}")
        print(result)
        return result
    except Exception as e:
        logging.error(f"Error retrieving neighbours for element_id: {element_id}: {e}")
        return {"nodes":[],"relationships":[]}