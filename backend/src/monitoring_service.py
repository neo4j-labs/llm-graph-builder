"""
Monitoring Service for tracking entities and detecting risk changes
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from .llm import get_llm
from .graph_query import search_and_get_subgraph
import json
import uuid

class MonitoringService:
    def __init__(self, graph):
        self.graph = graph
        self.logger = logging.getLogger(__name__)
    
    def get_monitored_entities(self) -> List[Dict[str, Any]]:
        """Get hardcoded list of monitored entities - can be moved to config later"""
        return [
            {
                "id": "entity_1",
                "name": "Bill Gates",
                "type": "Individual",
                "risk_threshold": 0.7,
                "category": "Technology"
            },
            {
                "id": "entity_2", 
                "name": "Microsoft",
                "type": "Organization",
                "risk_threshold": 0.6,
                "category": "Technology"
            },
            {
                "id": "entity_3",
                "name": "OpenAI",
                "type": "Organization", 
                "risk_threshold": 0.8,
                "category": "AI"
            }
        ]
    
    async def initialize_monitoring_schema(self):
        """Initialize the monitoring schema in Neo4j if it doesn't exist"""
        try:
            # Create constraints and indexes for monitoring
            schema_queries = [
                # Monitor constraints
                "CREATE CONSTRAINT monitor_id_unique IF NOT EXISTS FOR (m:Monitor) REQUIRE m.id IS UNIQUE",
                "CREATE INDEX monitor_entity_name IF NOT EXISTS FOR (m:Monitor) ON (m.entity_name)",
                "CREATE INDEX monitor_status IF NOT EXISTS FOR (m:Monitor) ON (m.status)",
                
                # Risk Assessment constraints
                "CREATE CONSTRAINT assessment_id_unique IF NOT EXISTS FOR (ra:RiskAssessment) REQUIRE ra.id IS UNIQUE",
                "CREATE INDEX assessment_entity_name IF NOT EXISTS FOR (ra:RiskAssessment) ON (ra.entity_name)",
                "CREATE INDEX assessment_timestamp IF NOT EXISTS FOR (ra:RiskAssessment) ON (ra.timestamp)",
                
                # Alert constraints
                "CREATE CONSTRAINT alert_id_unique IF NOT EXISTS FOR (a:Alert) REQUIRE a.id IS UNIQUE",
                "CREATE INDEX alert_entity_name IF NOT EXISTS FOR (a:Alert) ON (a.entity_name)",
                "CREATE INDEX alert_timestamp IF NOT EXISTS FOR (a:Alert) ON (a.timestamp)"
            ]
            
            for query in schema_queries:
                try:
                    self.graph.query(query)
                except Exception as e:
                    # Index/constraint might already exist, continue
                    self.logger.debug(f"Schema query result: {e}")
            
            self.logger.info("Monitoring schema initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Error initializing monitoring schema: {str(e)}")
    
    def store_monitored_entity(self, entity_data: Dict[str, Any]) -> str:
        """Store a monitored entity in Neo4j"""
        try:
            entity_id = entity_data.get("id") or f"monitor_{uuid.uuid4()}"
            
            query = """
            MERGE (m:Monitor {id: $id})
            SET m.entity_name = $name,
                m.entity_type = $type,
                m.risk_threshold = $threshold,
                m.category = $category,
                m.status = $status,
                m.created_at = $created_at,
                m.updated_at = $updated_at
            RETURN m.id as id
            """
            
            params = {
                "id": entity_id,
                "name": entity_data["name"],
                "type": entity_data["type"],
                "threshold": entity_data["risk_threshold"],
                "category": entity_data["category"],
                "status": entity_data.get("status", "active"),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.graph.query(query, params)
            if result:
                self.logger.info(f"Stored monitored entity: {entity_data['name']}")
                return entity_id
            else:
                raise Exception("Failed to store monitored entity")
                
        except Exception as e:
            self.logger.error(f"Error storing monitored entity: {str(e)}")
            raise e
    
    def get_monitored_entities_from_db(self) -> List[Dict[str, Any]]:
        """Retrieve all monitored entities from Neo4j"""
        try:
            query = """
            MATCH (m:Monitor)
            RETURN m.id as id, m.entity_name as name, m.entity_type as type,
                   m.risk_threshold as risk_threshold, m.category as category,
                   m.status as status, m.created_at as created_at
            ORDER BY m.created_at DESC
            """
            
            result = self.graph.query(query)
            entities = []
            
            for row in result:
                entities.append({
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "risk_threshold": row["risk_threshold"],
                    "category": row["category"],
                    "status": row["status"],
                    "created_at": row["created_at"]
                })
            
            return entities
            
        except Exception as e:
            self.logger.error(f"Error retrieving monitored entities: {str(e)}")
            return []
    
    async def check_entity_risk_changes(self, monitored_entities: List[str], model: str = "openai_gpt_4o") -> Dict[str, Any]:
        """
        Check if risk has increased for monitored entities based on new graph data
        This is triggered after each document upload/URL scan
        """
        try:
            self.logger.info(f"Checking risk changes for {len(monitored_entities)} monitored entities")
            
            # Initialize schema if needed
            await self.initialize_monitoring_schema()
            
            results = {
                "timestamp": datetime.now().isoformat(),
                "entities_checked": len(monitored_entities),
                "risk_changes": [],
                "alerts": []
            }
            
            for entity_name in monitored_entities:
                try:
                    # Get current risk assessment for the entity
                    current_risk = await self._assess_entity_risk(entity_name, model)
                    
                    # Get previous risk assessment from storage
                    previous_risk = await self._get_previous_risk_assessment(entity_name)
                    
                    # Compare and detect changes
                    risk_change = self._detect_risk_change(entity_name, previous_risk, current_risk)
                    
                    if risk_change:
                        results["risk_changes"].append(risk_change)
                        
                        # Create alert if risk increased significantly
                        if risk_change.get("risk_increased", False):
                            alert = await self._create_and_store_alert(entity_name, risk_change)
                            results["alerts"].append(alert)
                    
                    # Store current assessment for future comparison
                    await self._store_risk_assessment(entity_name, current_risk)
                    
                except Exception as e:
                    self.logger.error(f"Error checking entity {entity_name}: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error in check_entity_risk_changes: {str(e)}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _assess_entity_risk(self, entity_name: str, model: str) -> Dict[str, Any]:
        """Assess current risk for an entity using existing graph data"""
        try:
            # Use existing graph query to get entity subgraph
            try:
                subgraph_result = await search_and_get_subgraph(
                    self.graph,
                    entity_name,
                    "Entity",
                    depth=3,
                    max_results=20
                )
            except Exception as e:
                self.logger.warning(f"Could not get subgraph for {entity_name}: {str(e)}")
                # Return basic assessment if subgraph query fails
                return {
                    "entity_name": entity_name,
                    "risk_score": 0.1,  # Low risk as fallback
                    "risk_level": "LOW",
                    "connections_count": 0,
                    "risk_indicators": [],
                    "new_connections": [],
                    "timestamp": datetime.now().isoformat(),
                    "error": f"Subgraph query failed: {str(e)}"
                }
            
            if not subgraph_result or not subgraph_result.get("subgraphs"):
                return {
                    "entity_name": entity_name,
                    "risk_score": 0.0,
                    "risk_level": "UNKNOWN",
                    "connections_count": 0,
                    "new_connections": [],
                    "timestamp": datetime.now().isoformat()
                }
            
            # Extract relevant information from subgraph
            subgraph = subgraph_result["subgraphs"][0]
            nodes = subgraph.get("nodes", [])
            relationships = subgraph.get("relationships", [])
            
            # Count connections and analyze risk indicators
            connections_count = len(relationships)
            risk_indicators = self._extract_risk_indicators(nodes, relationships)
            
            # Calculate risk score based on connections and indicators
            risk_score = self._calculate_risk_score(connections_count, risk_indicators)
            risk_level = self._get_risk_level(risk_score)
            
            return {
                "entity_name": entity_name,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "connections_count": connections_count,
                "risk_indicators": risk_indicators,
                "new_connections": [],  # Will be populated by comparison
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error assessing risk for {entity_name}: {str(e)}")
            return {
                "entity_name": entity_name,
                "risk_score": 0.0,
                "risk_level": "UNKNOWN",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _extract_risk_indicators(self, nodes: List[Dict], relationships: List[Dict]) -> List[str]:
        """Extract risk indicators from graph nodes and relationships"""
        risk_indicators = []
        
        # Look for risk-related properties and labels
        for node in nodes:
            labels = node.get("labels", [])
            properties = node.get("properties", {})
            
            # Check for risk-related labels
            if any(label.lower() in ["risk", "threat", "suspicious", "sanction"] for label in labels):
                risk_indicators.append(f"Risk-related node: {node.get('properties', {}).get('name', 'Unknown')}")
            
            # Check for risk-related properties
            for key, value in properties.items():
                if isinstance(value, str) and any(term in value.lower() for term in ["risk", "threat", "suspicious", "sanction"]):
                    risk_indicators.append(f"Risk indicator in {key}: {value}")
        
        # Check relationships for risk patterns
        for rel in relationships:
            rel_type = rel.get("type", "")
            if any(term in rel_type.lower() for term in ["risk", "threat", "suspicious"]):
                risk_indicators.append(f"Risk relationship: {rel_type}")
        
        return risk_indicators
    
    def _calculate_risk_score(self, connections_count: int, risk_indicators: List[str]) -> float:
        """Calculate risk score based on connections and indicators"""
        base_score = min(connections_count * 0.1, 0.5)  # Base score from connections
        
        indicator_score = min(len(risk_indicators) * 0.2, 0.5)  # Score from risk indicators
        
        total_score = base_score + indicator_score
        
        # Normalize to 0.0 - 1.0 range
        return min(total_score, 1.0)
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 0.7:
            return "HIGH"
        elif risk_score >= 0.4:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _detect_risk_change(self, entity_name: str, previous_risk: Optional[Dict], current_risk: Dict) -> Optional[Dict]:
        """Detect if risk has changed for an entity"""
        if not previous_risk:
            return {
                "entity_name": entity_name,
                "change_type": "initial_assessment",
                "previous_score": None,
                "current_score": current_risk["risk_score"],
                "score_change": 0,
                "risk_increased": False,
                "details": "First risk assessment"
            }
        
        previous_score = previous_risk.get("risk_score", 0.0)
        current_score = current_risk["risk_score"]
        score_change = current_score - previous_score
        
        # Determine if risk increased significantly (more than 20%)
        risk_increased = score_change > 0.2
        
        # Check for new connections
        previous_connections = previous_risk.get("connections_count", 0)
        current_connections = current_risk.get("connections_count", 0)
        new_connections = current_connections - previous_connections
        
        return {
            "entity_name": entity_name,
            "change_type": "risk_change",
            "previous_score": previous_score,
            "current_score": current_score,
            "score_change": score_change,
            "risk_increased": risk_increased,
            "connections_change": new_connections,
            "details": f"Risk score changed from {previous_score:.2f} to {current_score:.2f}"
        }
    
    async def _create_and_store_alert(self, entity_name: str, risk_change: Dict) -> Dict[str, Any]:
        """Create and store an alert for significant risk changes"""
        try:
            alert_id = f"alert_{uuid.uuid4()}"
            alert_data = {
                "id": alert_id,
                "entity_name": entity_name,
                "type": "risk_increase" if risk_change.get("risk_increased") else "risk_change",
                "severity": "high" if risk_change.get("risk_increased") else "medium",
                "title": f"Risk Change Detected: {entity_name}",
                "description": risk_change.get("details", "Risk level has changed"),
                "timestamp": datetime.now().isoformat(),
                "risk_change": risk_change
            }
            
            # Store alert in Neo4j
            query = """
            CREATE (a:Alert {
                id: $id,
                entity_name: $entity_name,
                type: $type,
                severity: $severity,
                title: $title,
                description: $description,
                timestamp: $timestamp,
                risk_change_data: $risk_change_data
            })
            RETURN a.id as id
            """
            
            params = {
                "id": alert_id,
                "entity_name": entity_name,
                "type": alert_data["type"],
                "severity": alert_data["severity"],
                "title": alert_data["title"],
                "description": alert_data["description"],
                "timestamp": alert_data["timestamp"],
                "risk_change_data": json.dumps(risk_change)
            }
            
            result = await self.graph.query(query, params)
            if result:
                self.logger.info(f"Stored alert for {entity_name}: {alert_id}")
                return alert_data
            else:
                raise Exception("Failed to store alert")
                
        except Exception as e:
            self.logger.error(f"Error creating alert: {str(e)}")
            # Return alert data even if storage fails
            return {
                "id": f"alert_{datetime.now().timestamp()}",
                "entity_name": entity_name,
                "type": "risk_increase" if risk_change.get("risk_increased") else "risk_change",
                "severity": "high" if risk_change.get("risk_increased") else "medium",
                "title": f"Risk Change Detected: {entity_name}",
                "description": risk_change.get("details", "Risk level has changed"),
                "timestamp": datetime.now().isoformat(),
                "risk_change": risk_change
            }
    
    async def _get_previous_risk_assessment(self, entity_name: str) -> Optional[Dict]:
        """Get previous risk assessment from Neo4j storage"""
        try:
            query = """
            MATCH (ra:RiskAssessment {entity_name: $entity_name})
            RETURN ra.risk_score as risk_score, ra.risk_level as risk_level,
                   ra.connections_count as connections_count, ra.risk_indicators as risk_indicators,
                   ra.timestamp as timestamp
            ORDER BY ra.timestamp DESC
            LIMIT 1
            """
            
            result = self.graph.query(query, {"entity_name": entity_name})
            
            if result:
                row = result[0]
                return {
                    "risk_score": row["risk_score"],
                    "risk_level": row["risk_level"],
                    "connections_count": row["connections_count"],
                    "risk_indicators": row["risk_indicators"] if row["risk_indicators"] else [],
                    "timestamp": row["timestamp"]
                }
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"Error retrieving previous risk assessment for {entity_name}: {str(e)}")
            return None
    
    async def _store_risk_assessment(self, entity_name: str, assessment: Dict):
        """Store current risk assessment in Neo4j for future comparison"""
        try:
            assessment_id = f"assessment_{uuid.uuid4()}"
            
            query = """
            CREATE (ra:RiskAssessment {
                id: $id,
                entity_name: $entity_name,
                risk_score: $risk_score,
                risk_level: $risk_level,
                connections_count: $connections_count,
                risk_indicators: $risk_indicators,
                timestamp: $timestamp
            })
            """
            
            params = {
                "id": assessment_id,
                "entity_name": entity_name,
                "risk_score": assessment["risk_score"],
                "risk_level": assessment["risk_level"],
                "connections_count": assessment["connections_count"],
                "risk_indicators": assessment.get("risk_indicators", []),
                "timestamp": assessment["timestamp"]
            }
            
            self.graph.query(query, params)
            self.logger.info(f"Stored risk assessment for {entity_name}: {assessment_id}")
            
        except Exception as e:
            self.logger.error(f"Error storing risk assessment for {entity_name}: {str(e)}")
            # Continue execution even if storage fails
            pass
    
    def remove_monitored_entity(self, entity_id: str) -> bool:
        """Remove a monitored entity from Neo4j"""
        try:
            self.logger.info(f"Attempting to remove monitored entity with ID: {entity_id}")
            
            # First, let's check if the entity exists
            check_query = """
            MATCH (m:Monitor {id: $entity_id})
            RETURN m.id as id, m.entity_name as name
            """
            
            check_result = self.graph.query(check_query, {"entity_id": entity_id})
            self.logger.info(f"Check query result: {check_result}")
            
            if not check_result:
                self.logger.warning(f"Entity not found with ID: {entity_id}")
                return False
            
            # Remove the monitor node and related data
            query = """
            MATCH (m:Monitor {id: $entity_id})
            OPTIONAL MATCH (ra:RiskAssessment {entity_name: m.entity_name})
            OPTIONAL MATCH (a:Alert {entity_name: m.entity_name})
            DELETE m, ra, a
            RETURN count(m) as deleted_count
            """
            
            result = self.graph.query(query, {"entity_id": entity_id})
            self.logger.info(f"Delete query result: {result}")
            
            if result and result[0]["deleted_count"] > 0:
                self.logger.info(f"Successfully removed monitored entity: {entity_id}")
                return True
            else:
                self.logger.warning(f"Failed to delete entity: {entity_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error removing monitored entity {entity_id}: {str(e)}")
            return False
    
    def get_monitoring_alerts(self) -> List[Dict]:
        """Get all monitoring alerts from Neo4j"""
        try:
            query = """
            MATCH (a:Alert)
            RETURN a.id as id, a.entity_name as entity_name, 
                   a.severity as severity, a.message as message, 
                   a.timestamp as timestamp
            ORDER BY a.timestamp DESC
            """
            
            result = self.graph.query(query)
            
            if result:
                alerts = []
                for record in result:
                    alerts.append({
                        "id": record["id"],
                        "entity_name": record["entity_name"],
                        "severity": record["severity"],
                        "message": record["message"],
                        "timestamp": record["timestamp"]
                    })
                return alerts
            else:
                return []
                
        except Exception as e:
            self.logger.error(f"Error getting monitoring alerts: {str(e)}")
            return []
