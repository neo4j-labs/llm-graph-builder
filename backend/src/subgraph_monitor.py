"""
Subgraph Monitoring Service for automatic risk detection
"""

import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from src.database import DatabaseManager
from src.shared.common_fn import create_graph_database_connection

logger = logging.getLogger(__name__)

class SubgraphMonitor:
    def __init__(self):
        self.db = DatabaseManager()
        self.logger = logger
    
    def extract_entity_subgraph(self, entity_name: str, graph_connection) -> Dict[str, Any]:
        """
        Extract subgraph for a specific entity using Cypher query
        """
        try:
            # Cypher query to extract subgraph information
            query = """
            MATCH (e:__Entity__ {id: $entity_name})
            OPTIONAL MATCH (e)-[r]-(related)
            WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
            RETURN 
                size(nodes) as node_count, 
                size(relationships) as relationship_count,
                e.id as entity_id,
                e.description as entity_description
            """
            
            result = graph_connection.run(query, entity_name=entity_name)
            record = result.single()
            
            if record:
                subgraph_data = {
                    "entity_name": entity_name,
                    "node_count": record["node_count"],
                    "relationship_count": record["relationship_count"],
                    "entity_id": record["entity_id"],
                    "entity_description": record["entity_description"],
                    "timestamp": datetime.now()
                }
                
                # Generate subgraph signature for change detection
                signature_data = f"{entity_name}:{record['node_count']}:{record['relationship_count']}"
                subgraph_data["subgraph_signature"] = hashlib.md5(signature_data.encode()).hexdigest()
                
                self.logger.info(f"Extracted subgraph for {entity_name}: {record['node_count']} nodes, {record['relationship_count']} relationships")
                return subgraph_data
            else:
                self.logger.warning(f"No subgraph found for entity: {entity_name}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error extracting subgraph for {entity_name}: {str(e)}")
            return None
    
    def get_monitored_entities(self) -> List[Dict[str, Any]]:
        """
        Get all monitored entities from database
        """
        try:
            query = """
            SELECT id, name, type, risk_threshold, category, status,
                   last_subgraph_nodes, last_subgraph_relationships, 
                   last_subgraph_timestamp, subgraph_signature
            FROM monitored_entities
            WHERE status = 'active'
            ORDER BY name
            """
            
            result = self.db.execute_query(query)
            return [dict(row) for row in result]
            
        except Exception as e:
            self.logger.error(f"Error getting monitored entities: {str(e)}")
            return []
    
    def update_entity_subgraph(self, entity_id: int, subgraph_data: Dict[str, Any]) -> bool:
        """
        Update entity's subgraph information in database
        """
        try:
            query = """
            UPDATE monitored_entities 
            SET last_subgraph_nodes = %s,
                last_subgraph_relationships = %s,
                last_subgraph_timestamp = %s,
                subgraph_signature = %s,
                updated_at = %s
            WHERE id = %s
            """
            
            params = (
                subgraph_data["node_count"],
                subgraph_data["relationship_count"],
                subgraph_data["timestamp"],
                subgraph_data["subgraph_signature"],
                datetime.now(),
                entity_id
            )
            
            result = self.db.execute_command(query, params)
            return result > 0
            
        except Exception as e:
            self.logger.error(f"Error updating entity subgraph: {str(e)}")
            return False
    
    def store_subgraph_snapshot(self, entity_id: int, subgraph_data: Dict[str, Any]) -> bool:
        """
        Store subgraph snapshot for historical tracking
        """
        try:
            query = """
            INSERT INTO subgraph_snapshots (entity_id, node_count, relationship_count, subgraph_signature, timestamp)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            params = (
                entity_id,
                subgraph_data["node_count"],
                subgraph_data["relationship_count"],
                subgraph_data["subgraph_signature"],
                subgraph_data["timestamp"]
            )
            
            result = self.db.execute_command(query, params)
            return result > 0
            
        except Exception as e:
            self.logger.error(f"Error storing subgraph snapshot: {str(e)}")
            return False
    
    def has_subgraph_changed(self, entity: Dict[str, Any], current_subgraph: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if entity's subgraph has changed significantly
        """
        try:
            # If no previous subgraph data, consider it as a new entity
            if not entity.get("last_subgraph_nodes") or not entity.get("last_subgraph_relationships"):
                return True, {
                    "change_type": "new_entity",
                    "previous_nodes": 0,
                    "current_nodes": current_subgraph["node_count"],
                    "previous_relationships": 0,
                    "current_relationships": current_subgraph["relationship_count"],
                    "node_change": current_subgraph["node_count"],
                    "relationship_change": current_subgraph["relationship_count"]
                }
            
            # Calculate changes
            node_change = abs(current_subgraph["node_count"] - entity["last_subgraph_nodes"])
            relationship_change = abs(current_subgraph["relationship_count"] - entity["last_subgraph_relationships"])
            
            # Check if signature changed (structural change)
            signature_changed = entity.get("subgraph_signature") != current_subgraph["subgraph_signature"]
            
            # Define thresholds for significant changes
            significant_node_change = node_change > 2
            significant_relationship_change = relationship_change > 3
            
            has_changed = significant_node_change or significant_relationship_change or signature_changed
            
            change_details = {
                "change_type": "subgraph_change" if has_changed else "no_change",
                "previous_nodes": entity["last_subgraph_nodes"],
                "current_nodes": current_subgraph["node_count"],
                "previous_relationships": entity["last_subgraph_relationships"],
                "current_relationships": current_subgraph["relationship_count"],
                "node_change": node_change,
                "relationship_change": relationship_change,
                "signature_changed": signature_changed,
                "significant_change": has_changed
            }
            
            if has_changed:
                self.logger.info(f"Subgraph change detected for {entity['name']}: "
                               f"Nodes: {entity['last_subgraph_nodes']} → {current_subgraph['node_count']} "
                               f"Relationships: {entity['last_subgraph_relationships']} → {current_subgraph['relationship_count']}")
            
            return has_changed, change_details
            
        except Exception as e:
            self.logger.error(f"Error checking subgraph changes: {str(e)}")
            return False, {}
    
    async def monitor_all_entities(self, neo4j_uri: str = None, neo4j_username: str = None, 
                                  neo4j_password: str = None, neo4j_database: str = None) -> Dict[str, Any]:
        """
        Monitor all active entities for subgraph changes
        """
        try:
            self.logger.info("Starting subgraph monitoring for all entities")
            
            # Get monitored entities
            entities = self.get_monitored_entities()
            if not entities:
                self.logger.info("No active monitored entities found")
                return {"entities_checked": 0, "changes_detected": 0, "results": []}
            
            # Establish Neo4j connection
            graph_connection = None
            if neo4j_uri and neo4j_username and neo4j_password:
                try:
                    graph_connection = create_graph_database_connection(
                        neo4j_uri, neo4j_username, neo4j_password, neo4j_database
                    )
                    self.logger.info("Neo4j connection established for subgraph monitoring")
                except Exception as e:
                    self.logger.error(f"Failed to establish Neo4j connection: {e}")
                    return {"error": "Neo4j connection failed", "entities_checked": 0}
            else:
                self.logger.error("Neo4j connection parameters not provided")
                return {"error": "Neo4j connection parameters required", "entities_checked": 0}
            
            results = []
            changes_detected = 0
            
            for entity in entities:
                try:
                    # Extract current subgraph
                    current_subgraph = self.extract_entity_subgraph(entity["name"], graph_connection)
                    if not current_subgraph:
                        continue
                    
                    # Check for changes
                    has_changed, change_details = self.has_subgraph_changed(entity, current_subgraph)
                    
                    # Store subgraph snapshot
                    self.store_subgraph_snapshot(entity["id"], current_subgraph)
                    
                    # Update entity's current subgraph info
                    self.update_entity_subgraph(entity["id"], current_subgraph)
                    
                    # Prepare result
                    result = {
                        "entity_id": entity["id"],
                        "entity_name": entity["name"],
                        "has_changed": has_changed,
                        "change_details": change_details,
                        "current_subgraph": current_subgraph,
                        "previous_subgraph": {
                            "nodes": entity.get("last_subgraph_nodes", 0),
                            "relationships": entity.get("last_subgraph_relationships", 0),
                            "timestamp": entity.get("last_subgraph_timestamp")
                        }
                    }
                    
                    results.append(result)
                    
                    if has_changed:
                        changes_detected += 1
                        self.logger.info(f"Change detected for {entity['name']}: {change_details}")
                    
                except Exception as e:
                    self.logger.error(f"Error monitoring entity {entity['name']}: {str(e)}")
                    results.append({
                        "entity_id": entity["id"],
                        "entity_name": entity["name"],
                        "error": str(e),
                        "has_changed": False
                    })
            
            monitoring_result = {
                "entities_checked": len(entities),
                "changes_detected": changes_detected,
                "timestamp": datetime.now().isoformat(),
                "results": results
            }
            
            self.logger.info(f"Subgraph monitoring completed: {changes_detected} changes detected out of {len(entities)} entities")
            return monitoring_result
            
        except Exception as e:
            self.logger.error(f"Error in subgraph monitoring: {str(e)}")
            return {"error": str(e), "entities_checked": 0}
