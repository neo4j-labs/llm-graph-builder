"""
PostgreSQL-based Monitoring Service for entity monitoring and risk assessment
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from src.database import DatabaseManager

logger = logging.getLogger(__name__)

class MonitoringServicePG:
    def __init__(self):
        self.db = DatabaseManager()
        self.logger = logger
    
    def initialize_monitoring_schema(self) -> bool:
        """Initialize monitoring schema (tables are created by migrations)"""
        try:
            # Test if tables exist by running a simple query
            result = self.db.execute_query("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('monitored_entities', 'risk_assessments', 'alerts')
            """)
            
            if len(result) == 3:
                self.logger.info("Monitoring schema already exists")
                return True
            else:
                self.logger.warning("Monitoring schema not fully initialized. Run migrations first.")
                return False
                
        except Exception as e:
            self.logger.error(f"Error checking monitoring schema: {str(e)}")
            return False
    
    def store_monitored_entity(self, entity_data: Dict[str, Any]) -> int:
        """Store a monitored entity in PostgreSQL"""
        try:
            query = """
            INSERT INTO monitored_entities (name, type, risk_threshold, category, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """
            
            params = (
                entity_data["name"],
                entity_data["type"],
                entity_data.get("risk_threshold", 0.7),
                entity_data.get("category", "General"),
                entity_data.get("status", "active"),
                datetime.now(),
                datetime.now()
            )
            
            # For INSERT with RETURNING, use the specialized method
            result = self.db.execute_insert_returning(query, params)
            if result:
                entity_id = result[0]["id"]
                self.logger.info(f"Stored monitored entity: {entity_data['name']} with ID: {entity_id}")
                return entity_id
            else:
                raise Exception("Failed to store monitored entity")
                
        except Exception as e:
            self.logger.error(f"Error storing monitored entity: {str(e)}")
            raise e
    
    def get_monitored_entities_from_db(self) -> List[Dict[str, Any]]:
        """Retrieve all monitored entities from PostgreSQL"""
        try:
            query = """
            SELECT id, name, type, risk_threshold, category, status, created_at
            FROM monitored_entities
            ORDER BY created_at DESC
            """
            
            result = self.db.execute_query(query)
            entities = []
            
            for row in result:
                entities.append({
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "risk_threshold": float(row["risk_threshold"]) if row["risk_threshold"] else 0.7,
                    "category": row["category"],
                    "status": row["status"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None
                })
            
            return entities
            
        except Exception as e:
            self.logger.error(f"Error retrieving monitored entities: {str(e)}")
            return []
    
    def remove_monitored_entity(self, entity_id: int) -> bool:
        """Remove a monitored entity from PostgreSQL"""
        try:
            self.logger.info(f"Attempting to remove monitored entity with ID: {entity_id}")
            
            # First, check if the entity exists
            check_query = """
            SELECT id, name FROM monitored_entities WHERE id = %s
            """
            
            check_result = self.db.execute_query(check_query, (entity_id,))
            self.logger.info(f"Check query result: {check_result}")
            
            if not check_result:
                self.logger.warning(f"Entity not found with ID: {entity_id}")
                return False
            
            # Remove related data first (due to foreign key constraints)
            # Delete alerts
            self.db.execute_command("DELETE FROM alerts WHERE entity_id = %s", (entity_id,))
            
            # Delete risk assessments
            self.db.execute_command("DELETE FROM risk_assessments WHERE entity_id = %s", (entity_id,))
            
            # Delete the monitored entity
            deleted_count = self.db.execute_command("DELETE FROM monitored_entities WHERE id = %s", (entity_id,))
            
            if deleted_count > 0:
                self.logger.info(f"Successfully removed monitored entity: {entity_id}")
                return True
            else:
                self.logger.warning(f"Failed to delete entity: {entity_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error removing monitored entity {entity_id}: {str(e)}")
            return False
    
    def get_monitoring_alerts(self) -> List[Dict]:
        """Get all monitoring alerts from PostgreSQL"""
        try:
            query = """
            SELECT a.id, a.severity, a.message, a.timestamp, a.is_active,
                   e.name as entity_name
            FROM alerts a
            JOIN monitored_entities e ON a.entity_id = e.id
            ORDER BY a.timestamp DESC
            """
            
            result = self.db.execute_query(query)
            
            if result:
                alerts = []
                for record in result:
                    alerts.append({
                        "id": record["id"],
                        "entity_name": record["entity_name"],
                        "severity": record["severity"],
                        "message": record["message"],
                        "timestamp": record["timestamp"].isoformat() if record["timestamp"] else None,
                        "is_active": record["is_active"]
                    })
                return alerts
            else:
                return []
                
        except Exception as e:
            self.logger.error(f"Error getting monitoring alerts: {str(e)}")
            return []
    
    def store_risk_assessment(self, entity_id: int, assessment: Dict) -> int:
        """Store a risk assessment in PostgreSQL"""
        try:
            query = """
            INSERT INTO risk_assessments (entity_id, risk_score, risk_level, connections_count, risk_indicators, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """
            
            params = (
                entity_id,
                assessment["risk_score"],
                assessment["risk_level"],
                assessment.get("connections_count", 0),
                assessment.get("risk_indicators", []),
                datetime.now()
            )
            
            result = self.db.execute_insert_returning(query, params)
            if result:
                assessment_id = result[0]["id"]
                self.logger.info(f"Stored risk assessment for entity {entity_id}: {assessment_id}")
                return assessment_id
            else:
                raise Exception("Failed to store risk assessment")
                
        except Exception as e:
            self.logger.error(f"Error storing risk assessment for entity {entity_id}: {str(e)}")
            raise e
    
    def get_latest_risk_assessment(self, entity_id: int) -> Optional[Dict]:
        """Get the latest risk assessment for an entity"""
        try:
            query = """
            SELECT id, risk_score, risk_level, connections_count, risk_indicators, timestamp
            FROM risk_assessments
            WHERE entity_id = %s
            ORDER BY timestamp DESC
            LIMIT 1
            """
            
            result = self.db.execute_query(query, (entity_id,))
            
            if result:
                row = result[0]
                return {
                    "id": row["id"],
                    "risk_score": float(row["risk_score"]),
                    "risk_level": row["risk_level"],
                    "connections_count": row["connections_count"],
                    "risk_indicators": row["risk_indicators"] or [],
                    "timestamp": row["timestamp"].isoformat() if row["timestamp"] else None
                }
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"Error retrieving risk assessment for entity {entity_id}: {str(e)}")
            return None
    
    def create_alert(self, entity_id: int, alert_data: Dict[str, Any]) -> int:
        """Create a new alert in PostgreSQL with LLM alert structure"""
        try:
            query = """
            INSERT INTO alerts (entity_id, type, score, message, evidence, indicator, name, context, timestamp, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """
            
            params = (
                entity_id,
                alert_data.get("type", "HIGH_RISK"),
                alert_data.get("score", 0.5),
                alert_data.get("description", ""),
                alert_data.get("evidence", ""),
                alert_data.get("indicator", ""),
                alert_data.get("name", ""),
                alert_data.get("context", ""),
                datetime.now(),
                True
            )
            
            result = self.db.execute_insert_returning(query, params)
            if result:
                alert_id = result[0]["id"]
                self.logger.info(f"Created alert {alert_id} for entity {entity_id}: {alert_data.get('type', 'HIGH_RISK')}")
                return alert_id
            else:
                raise Exception("Failed to create alert")
                
        except Exception as e:
            self.logger.error(f"Error creating alert for entity {entity_id}: {str(e)}")
            raise e
    
    def get_entity_by_name(self, entity_name: str) -> Optional[Dict]:
        """Get entity by name with fuzzy matching"""
        try:
            # First try exact match
            query = """
            SELECT id, name, type, risk_threshold, category, status
            FROM monitored_entities
            WHERE name = %s
            """
            
            result = self.db.execute_query(query, (entity_name,))
            
            if result:
                return result[0]
            
            # If no exact match, try case-insensitive partial matching
            query = """
            SELECT id, name, type, risk_threshold, category, status
            FROM monitored_entities
            WHERE LOWER(name) LIKE LOWER(%s)
            """
            
            result = self.db.execute_query(query, (f"%{entity_name}%",))
            
            if result:
                row = result[0]
                return {
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "risk_threshold": float(row["risk_threshold"]) if row["risk_threshold"] else 0.7,
                    "category": row["category"],
                    "status": row["status"]
                }
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"Error retrieving entity by name {entity_name}: {str(e)}")
            return None
    
    def update_entity_status(self, entity_id: int, status: str) -> bool:
        """Update entity status"""
        try:
            query = """
            UPDATE monitored_entities 
            SET status = %s, updated_at = %s
            WHERE id = %s
            """
            
            affected_rows = self.db.execute_command(query, (status, datetime.now(), entity_id))
            return affected_rows > 0
            
        except Exception as e:
            self.logger.error(f"Error updating entity status: {str(e)}")
            return False
    
    def get_active_alerts_count(self) -> int:
        """Get count of active alerts"""
        try:
            query = "SELECT COUNT(*) as count FROM alerts WHERE is_active = true"
            result = self.db.execute_query(query)
            return result[0]["count"] if result else 0
        except Exception as e:
            self.logger.error(f"Error getting active alerts count: {str(e)}")
            return 0
    
    def get_alerts_today_count(self) -> int:
        """Get count of alerts created today"""
        try:
            query = """
            SELECT COUNT(*) as count 
            FROM alerts 
            WHERE DATE(timestamp) = CURRENT_DATE
            """
            result = self.db.execute_query(query)
            return result[0]["count"] if result else 0
        except Exception as e:
            self.logger.error(f"Error getting today's alerts count: {str(e)}")
            return 0
    
    def acknowledge_alert(self, alert_id: int) -> bool:
        """Mark an alert as acknowledged (inactive)"""
        try:
            query = """
            UPDATE alerts 
            SET is_active = FALSE 
            WHERE id = %s
            """
            
            result = self.db.execute_command(query, (alert_id,))
            if result > 0:
                self.logger.info(f"Alert {alert_id} acknowledged successfully")
                return True
            else:
                self.logger.warning(f"Alert {alert_id} not found or already acknowledged")
                return False
                
        except Exception as e:
            self.logger.error(f"Error acknowledging alert {alert_id}: {str(e)}")
            return False
    
    def get_active_alerts_from_db(self) -> List[Dict[str, Any]]:
        """Retrieve only active (unacknowledged) alerts from PostgreSQL"""
        try:
            query = """
            SELECT a.id, a.severity, a.message, a.timestamp, a.is_active,
                   me.name as entity_name
            FROM alerts a
            LEFT JOIN monitored_entities me ON a.entity_id = me.id
            WHERE a.is_active = TRUE
            ORDER BY a.timestamp DESC
            """
            
            result = self.db.execute_query(query)
            active_alerts = []
            
            for row in result:
                active_alerts.append({
                    "id": row["id"],
                    "entity_name": row["name"] or "Unknown Entity",
                    "severity": row["severity"],
                    "message": row["message"],
                    "timestamp": row["timestamp"].isoformat() if row["timestamp"] else None,
                    "is_active": row["is_active"] if row["is_active"] is not None else True
                })
            
            return active_alerts
            
        except Exception as e:
            self.logger.error(f"Error retrieving active alerts: {str(e)}")
            return []
    
    async def check_entity_risk_changes(self, monitored_entities: List[str], model: str = "openai_gpt_4o", graph_connection=None) -> Dict[str, Any]:
        """
        Enhanced risk monitoring: Analyze sub-graphs and generate LLM-based alerts
        """
        try:
            self.logger.info(f"Enhanced risk monitoring for {len(monitored_entities)} entities using model: {model}")
            
            result = {
                "entities_checked": len(monitored_entities),
                "risk_changes_detected": 0,
                "alerts_generated": 0,
                "entities_with_changes": [],
                "model_used": model,
                "timestamp": datetime.now().isoformat()
            }
            
            if not graph_connection:
                self.logger.warning("No graph connection provided, using basic monitoring")
                return await self._basic_risk_check(monitored_entities, model)
            
            # Enhanced monitoring with graph analysis
            for entity_name in monitored_entities:
                entity = self.get_entity_by_name(entity_name)
                if not entity:
                    self.logger.warning(f"Entity not found in monitoring: {entity_name}")
                    continue
                
                try:
                    # Get current sub-graph for entity
                    current_subgraph = await self._get_entity_subgraph(graph_connection, entity_name)
                    
                    # Get previous risk assessment
                    previous_assessment = self.get_latest_risk_assessment(entity["id"])
                    
                    # Analyze risk changes
                    risk_analysis = await self._analyze_entity_risk_changes(
                        entity, current_subgraph, previous_assessment, model
                    )
                    
                    # Store new risk assessment
                    if risk_analysis["current_risk_score"] is not None:
                        self.store_risk_assessment(
                            entity["id"],
                            risk_analysis["current_risk_score"],
                            risk_analysis["risk_level"],
                            risk_analysis["connections_count"],
                            risk_analysis["risk_indicators"]
                        )
                    
                    # Generate alert if risk increased
                    if risk_analysis["risk_increased"]:
                        alert_message = await self._generate_llm_alert(
                            entity, risk_analysis, current_subgraph, model
                        )
                        
                        if alert_message:
                            alert_id = self.create_alert(
                                entity["id"],
                                risk_analysis["alert_severity"],
                                alert_message
                            )
                            result["alerts_generated"] += 1
                            self.logger.info(f"Generated alert {alert_id} for {entity_name}")
                    
                    # Add to results
                    result["entities_with_changes"].append({
                        "name": entity_name,
                        "id": entity["id"],
                        "current_risk": risk_analysis["current_risk_score"],
                        "risk_level": risk_analysis["risk_level"],
                        "risk_change": risk_analysis["risk_change_description"],
                        "connections_count": risk_analysis["connections_count"],
                        "alert_generated": risk_analysis["risk_increased"]
                    })
                    
                    if risk_analysis["risk_increased"]:
                        result["risk_changes_detected"] += 1
                        
                except Exception as e:
                    self.logger.error(f"Error analyzing entity {entity_name}: {str(e)}")
                    result["entities_with_changes"].append({
                        "name": entity_name,
                        "id": entity["id"],
                        "current_risk": "error",
                        "risk_change": f"Error: {str(e)}"
                    })
            
            self.logger.info(f"Enhanced risk monitoring completed. Result: {result}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error in enhanced risk monitoring: {str(e)}")
            return {
                "error": str(e),
                "entities_checked": 0,
                "risk_changes_detected": 0,
                "alerts_generated": 0
            }
    
    async def _basic_risk_check(self, monitored_entities: List[str], model: str) -> Dict[str, Any]:
        """Basic risk check when no graph connection is available"""
        result = {
            "entities_checked": len(monitored_entities),
            "risk_changes_detected": 0,
            "alerts_generated": 0,
            "entities_with_changes": [],
            "model_used": model,
            "timestamp": datetime.now().isoformat()
        }
        
        for entity_name in monitored_entities:
            entity = self.get_entity_by_name(entity_name)
            if entity:
                result["entities_with_changes"].append({
                    "name": entity_name,
                    "id": entity["id"],
                    "current_risk": "unknown",
                    "risk_change": "no_change_detected"
                })
            else:
                self.logger.warning(f"Entity not found in monitoring: {entity_name}")
        
        return result
    
    async def _get_entity_subgraph(self, graph_connection, entity_name: str) -> Dict[str, Any]:
        """Extract sub-graph for a specific entity"""
        try:
            # Cypher query to get entity sub-graph
            query = """
            MATCH (e:Entity {name: $entity_name})
            OPTIONAL MATCH (e)-[r]-(related)
            RETURN e, r, related
            LIMIT 100
            """
            
            result = graph_connection.query(query, {"entity_name": entity_name})
            
            # Process sub-graph data
            subgraph = {
                "entity": entity_name,
                "connections": [],
                "total_connections": 0,
                "risk_indicators": []
            }
            
            if result:
                for record in result:
                    if "r" in record and record["r"]:
                        connection = {
                            "type": record["r"].type,
                            "properties": dict(record["r"]),
                            "related_node": record["related"].get("name", "Unknown") if record["related"] else None
                        }
                        subgraph["connections"].append(connection)
                
                subgraph["total_connections"] = len(subgraph["connections"])
                
                # Extract risk indicators from connections
                risk_indicators = []
                for conn in subgraph["connections"]:
                    if conn["type"] in ["HAS_RISK", "ASSOCIATED_WITH", "CONNECTED_TO"]:
                        risk_indicators.append(conn["type"])
                
                subgraph["risk_indicators"] = list(set(risk_indicators))
            
            return subgraph
            
        except Exception as e:
            self.logger.error(f"Error getting sub-graph for {entity_name}: {str(e)}")
            return {"entity": entity_name, "connections": [], "total_connections": 0, "risk_indicators": []}
    
    async def _analyze_entity_risk_changes(self, entity: Dict, current_subgraph: Dict, previous_assessment: Optional[Dict], model: str) -> Dict[str, Any]:
        """Analyze risk changes for an entity"""
        try:
            # Calculate current risk based on sub-graph
            current_risk_score = self._calculate_risk_score(current_subgraph)
            current_risk_level = self._get_risk_level(current_risk_score)
            
            # Compare with previous assessment
            risk_increased = False
            risk_change_description = "no_change"
            alert_severity = "low"
            
            if previous_assessment:
                previous_score = float(previous_assessment["risk_score"])
                previous_connections = previous_assessment["connections_count"] or 0
                
                # Check if risk increased
                if current_risk_score > previous_score:
                    risk_increased = True
                    risk_change_description = f"Risk increased from {previous_score:.2f} to {current_risk_score:.2f}"
                    
                    # Determine alert severity
                    if current_risk_score - previous_score > 0.3:
                        alert_severity = "critical"
                    elif current_risk_score - previous_score > 0.2:
                        alert_severity = "high"
                    elif current_risk_score - previous_score > 0.1:
                        alert_severity = "medium"
                    else:
                        alert_severity = "low"
                
                elif current_subgraph["total_connections"] > previous_connections:
                    risk_increased = True
                    risk_change_description = f"Connections increased from {previous_connections} to {current_subgraph['total_connections']}"
                    alert_severity = "medium"
            
            return {
                "current_risk_score": current_risk_score,
                "risk_level": current_risk_level,
                "connections_count": current_subgraph["total_connections"],
                "risk_indicators": current_subgraph["risk_indicators"],
                "risk_increased": risk_increased,
                "risk_change_description": risk_change_description,
                "alert_severity": alert_severity
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing risk changes: {str(e)}")
            return {
                "current_risk_score": None,
                "risk_level": "unknown",
                "connections_count": 0,
                "risk_indicators": [],
                "risk_increased": False,
                "risk_change_description": "error",
                "alert_severity": "low"
            }
    
    def _calculate_risk_score(self, subgraph: Dict) -> float:
        """Calculate risk score based on sub-graph analysis"""
        try:
            base_score = 0.3  # Base risk score
            
            # Factor 1: Number of connections (more connections = higher risk)
            connection_factor = min(subgraph["total_connections"] * 0.05, 0.4)
            
            # Factor 2: Risk indicators
            risk_indicator_factor = len(subgraph["risk_indicators"]) * 0.1
            
            # Factor 3: Connection types (certain types indicate higher risk)
            high_risk_connections = sum(1 for conn in subgraph["connections"] 
                                      if conn["type"] in ["HAS_RISK", "ASSOCIATED_WITH"])
            high_risk_factor = high_risk_connections * 0.15
            
            total_score = base_score + connection_factor + risk_indicator_factor + high_risk_factor
            
            # Cap at 1.0
            return min(total_score, 1.0)
            
        except Exception as e:
            self.logger.error(f"Error calculating risk score: {str(e)}")
            return 0.5
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 0.8:
            return "critical"
        elif risk_score >= 0.6:
            return "high"
        elif risk_score >= 0.4:
            return "medium"
        else:
            return "low"
    
    async def _generate_llm_alert(self, entity: Dict, risk_analysis: Dict, subgraph: Dict, model: str) -> str:
        """Generate LLM-based alert message"""
        try:
            # This would integrate with your existing LLM system
            # For now, return a structured alert message
            
            alert_template = f"""
            RISK ALERT: {entity['name']} ({entity['type']})
            
            Risk Level: {risk_analysis['risk_level'].upper()}
            Current Risk Score: {risk_analysis['current_risk_score']:.2f}
            Risk Change: {risk_analysis['risk_change_description']}
            
            Connections: {risk_analysis['connections_count']}
            Risk Indicators: {', '.join(risk_analysis['risk_indicators']) if risk_analysis['risk_indicators'] else 'None detected'}
            
            Alert Severity: {risk_analysis['alert_severity'].upper()}
            Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            This alert was generated automatically by the risk monitoring system.
            """
            
            return alert_template.strip()
            
        except Exception as e:
            self.logger.error(f"Error generating LLM alert: {str(e)}")
            return f"Risk alert generated for {entity['name']}: {risk_analysis['risk_change_description']}"
