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
            # First, try to find the entity with different possible labels and properties
            queries = [
                # Try __Entity__ label with id property (exact match)
                {
                    "query": """
                    MATCH (e:__Entity__ {id: $entity_name})
                    OPTIONAL MATCH (e)-[r]-(related)
                    WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
                    RETURN 
                        size(nodes) as node_count, 
                        size(relationships) as relationship_count,
                        e.id as entity_id,
                        e.description as entity_description
                    """,
                    "params": {"entity_name": entity_name}
                },
                # Try __Entity__ label with name property (exact match)
                {
                    "query": """
                    MATCH (e:__Entity__ {name: $entity_name})
                    OPTIONAL MATCH (e)-[r]-(related)
                    WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
                    RETURN 
                        size(nodes) as node_count, 
                        size(relationships) as relationship_count,
                        e.id as entity_id,
                        e.description as entity_description
                    """,
                    "params": {"entity_name": entity_name}
                },
                # Try __Entity__ label with partial name match
                {
                    "query": """
                    MATCH (e:__Entity__)
                    WHERE e.id CONTAINS $entity_name OR e.name CONTAINS $entity_name OR e.description CONTAINS $entity_name
                    OPTIONAL MATCH (e)-[r]-(related)
                    WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
                    RETURN 
                        size(nodes) as node_count, 
                        size(relationships) as relationship_count,
                        e.id as entity_id,
                        e.description as entity_description
                    LIMIT 1
                    """,
                    "params": {"entity_name": entity_name}
                },
                # Try Entity label (without underscores) with various properties
                {
                    "query": """
                    MATCH (e:Entity)
                    WHERE e.id = $entity_name OR e.name = $entity_name OR e.description CONTAINS $entity_name
                    OPTIONAL MATCH (e)-[r]-(related)
                    WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
                    RETURN 
                        size(nodes) as node_count, 
                        size(relationships) as relationship_count,
                        e.id as entity_id,
                        e.description as entity_description
                    LIMIT 1
                    """,
                    "params": {"entity_name": entity_name}
                },
                # Try searching by any label with any property containing the name
                {
                    "query": """
                    MATCH (e)
                    WHERE e.id CONTAINS $entity_name OR e.name CONTAINS $entity_name OR e.description CONTAINS $entity_name
                    OPTIONAL MATCH (e)-[r]-(related)
                    WITH e, collect(DISTINCT related) as nodes, collect(DISTINCT r) as relationships
                    RETURN 
                        size(nodes) as node_count, 
                        size(relationships) as relationship_count,
                        e.id as entity_id,
                        e.description as entity_description
                    LIMIT 1
                    """,
                    "params": {"entity_name": entity_name}
                }
            ]
            
            for i, query_info in enumerate(queries):
                try:
                    self.logger.info(f"Trying query {i+1} for entity: {entity_name}")
                    self.logger.debug(f"Query: {query_info['query']}")
                    self.logger.debug(f"Params: {query_info['params']}")
                    
                    result = graph_connection.query(query_info["query"], query_info["params"])
                    
                    if result and len(result) > 0:
                        record = result[0]
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
                        
                        self.logger.info(f"Extracted subgraph for {entity_name} using query {i+1}: {record['node_count']} nodes, {record['relationship_count']} relationships")
                        return subgraph_data
                    else:
                        self.logger.debug(f"Query {i+1} returned no results for {entity_name}")
                        
                except Exception as e:
                    self.logger.debug(f"Query {i+1} failed for {entity_name}: {str(e)}")
                    continue
            
            # If all queries failed, log a warning
            self.logger.warning(f"No subgraph found for entity: {entity_name} after trying all query variations")
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
            
            self.db.execute_query(query, params)
            self.logger.info(f"Updated subgraph for entity {entity_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error updating subgraph for entity {entity_id}: {str(e)}")
            return False
    
    def store_subgraph_snapshot(self, entity_id: int, subgraph_data: Dict[str, Any]) -> bool:
        """
        Store a snapshot of the subgraph for historical tracking
        """
        try:
            query = """
            INSERT INTO subgraph_snapshots (entity_id, node_count, relationship_count, 
                                          subgraph_signature, timestamp)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            params = (
                entity_id,
                subgraph_data["node_count"],
                subgraph_data["relationship_count"],
                subgraph_data["subgraph_signature"],
                subgraph_data["timestamp"]
            )
            
            self.db.execute_query(query, params)
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing subgraph snapshot: {str(e)}")
            return False
    
    def has_subgraph_changed(self, entity: Dict[str, Any], current_subgraph: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if entity's subgraph has changed significantly
        """
        try:
            if not entity.get("subgraph_signature"):
                # First time monitoring this entity
                return True, {"type": "initial_monitoring", "details": "First subgraph snapshot"}
            
            # Check if signature changed
            if entity["subgraph_signature"] != current_subgraph["subgraph_signature"]:
                change_details = {
                    "type": "subgraph_change",
                    "details": (f"Subgraph signature changed. "
                               f"Nodes: {entity['last_subgraph_nodes']} → {current_subgraph['node_count']} "
                               f"Relationships: {entity['last_subgraph_relationships']} → {current_subgraph['relationship_count']}")
                }
                
                # Check if change is significant (more than 10% change)
                if entity.get("last_subgraph_nodes") and entity.get("last_subgraph_relationships"):
                    node_change = abs(current_subgraph["node_count"] - entity["last_subgraph_nodes"])
                    rel_change = abs(current_subgraph["relationship_count"] - entity["last_subgraph_relationships"])
                    
                    if node_change > entity["last_subgraph_nodes"] * 0.1 or rel_change > entity["last_subgraph_relationships"] * 0.1:
                        change_details["significance"] = "high"
                        change_details["details"] += " (Significant change detected)"
                    else:
                        change_details["significance"] = "low"
                
                return True, change_details
            
            return False, {}
            
        except Exception as e:
            self.logger.error(f"Error checking subgraph changes: {str(e)}")
            return False, {}
    
    async def _trigger_risk_assessment(self, entity: Dict[str, Any], current_subgraph: Dict[str, Any], 
                                     graph_connection, model: str = "openai_gpt_4o") -> Dict[str, Any]:
        """
        Trigger risk assessment when subgraph changes are detected
        """
        try:
            from src.monitoring_service_pg import MonitoringServicePG
            
            monitoring_service = MonitoringServicePG()
            
            # Get current risk assessment
            current_risk = await monitoring_service._get_entity_subgraph(graph_connection, entity["name"])
            
            # Get previous risk assessment
            previous_assessment = monitoring_service.get_latest_risk_assessment(entity["id"])
            
            # Analyze risk changes
            risk_analysis = await monitoring_service._analyze_entity_risk_changes(
                entity, current_risk, previous_assessment, model
            )
            
            # Store new risk assessment
            if risk_analysis["current_risk_score"] is not None:
                assessment_data = {
                    "risk_score": risk_analysis["current_risk_score"],
                    "risk_level": risk_analysis["risk_level"],
                    "connections_count": risk_analysis["connections_count"],
                    "risk_indicators": risk_analysis["risk_indicators"]
                }
                monitoring_service.store_risk_assessment(
                    entity["id"],
                    assessment_data
                )
            
            # Generate alert if risk increased
            if risk_analysis["risk_increased"]:
                alert_message = await monitoring_service._generate_llm_alert(
                    entity, risk_analysis, current_risk, model
                )
                
                if alert_message:
                    alert_id = monitoring_service.create_alert(
                        entity["id"],
                        risk_analysis["alert_severity"],
                        alert_message
                    )
                    self.logger.info(f"Generated alert {alert_id} for {entity['name']} due to subgraph changes")
                    
                    # Add alert info to risk analysis
                    risk_analysis["alert_id"] = alert_id
                    risk_analysis["alert_message"] = alert_message
            
            return risk_analysis
            
        except Exception as e:
            self.logger.error(f"Error triggering risk assessment for {entity['name']}: {str(e)}")
            return {"error": str(e), "risk_increased": False}
    
    async def monitor_all_entities(self, neo4j_uri: str = None, neo4j_username: str = None, 
                                  neo4j_password: str = None, neo4j_database: str = None,
                                  model: str = "openai_gpt_4o") -> Dict[str, Any]:
        """
        Monitor all active entities for subgraph changes and trigger risk assessment
        """
        try:
            self.logger.info("Starting enhanced subgraph monitoring with risk assessment for all entities")
            
            # Get monitored entities
            entities = self.get_monitored_entities()
            if not entities:
                self.logger.info("No active monitored entities found")
                return {"entities_checked": 0, "changes_detected": 0, "alerts_generated": 0, "results": []}
            
            # Establish Neo4j connection
            graph_connection = None
            if neo4j_uri and neo4j_username and neo4j_password:
                try:
                    graph_connection = create_graph_database_connection(
                        neo4j_uri, neo4j_username, neo4j_password, neo4j_database
                    )
                    self.logger.info("Neo4j connection established for enhanced subgraph monitoring")
                except Exception as e:
                    self.logger.error(f"Failed to establish Neo4j connection: {e}")
                    return {"error": "Neo4j connection failed", "entities_checked": 0}
            else:
                self.logger.error("Neo4j connection parameters not provided")
                return {"error": "Neo4j connection parameters required", "entities_checked": 0}
            
            results = []
            changes_detected = 0
            alerts_generated = 0
            
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
                    
                    # Trigger risk assessment if changes detected
                    risk_assessment = None
                    if has_changed:
                        self.logger.info(f"Subgraph changes detected for {entity['name']}, triggering risk assessment")
                        risk_assessment = await self._trigger_risk_assessment(
                            entity, current_subgraph, graph_connection, model
                        )
                        
                        if risk_assessment and risk_assessment.get("risk_increased"):
                            alerts_generated += 1
                    
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
                        },
                        "risk_assessment": risk_assessment
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
                "alerts_generated": alerts_generated,
                "timestamp": datetime.now().isoformat(),
                "results": results
            }
            
            self.logger.info(f"Enhanced subgraph monitoring completed: {changes_detected} changes detected, {alerts_generated} alerts generated out of {len(entities)} entities")
            return monitoring_result
            
        except Exception as e:
            self.logger.error(f"Error in enhanced subgraph monitoring: {str(e)}")
            return {"error": str(e), "entities_checked": 0}
