"""
PostgreSQL database configuration and connection management
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pool = None
        self._init_pool()
    
    def _init_pool(self):
        """Initialize connection pool"""
        try:
            # Get database URL from environment
            database_url = os.getenv("DATABASE_URL")
            
            if database_url:
                # Parse DATABASE_URL format: postgresql://user:password@host:port/dbname
                self.pool = SimpleConnectionPool(
                    minconn=1,
                    maxconn=10,
                    dsn=database_url
                )
                logger.info("Database pool initialized with DATABASE_URL")
            else:
                # Fallback to individual environment variables
                host = os.getenv("POSTGRES_HOST", "localhost")
                port = os.getenv("POSTGRES_PORT", "5432")
                database = os.getenv("POSTGRES_DB", "monitoring_db")
                user = os.getenv("POSTGRES_USER", "postgres")
                password = os.getenv("POSTGRES_PASSWORD", "password")
                
                self.pool = SimpleConnectionPool(
                    minconn=1,
                    maxconn=10,
                    host=host,
                    port=port,
                    database=database,
                    user=user,
                    password=password
                )
                logger.info(f"Database pool initialized with host: {host}, database: {database}")
                
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            self.pool = None
    
    @contextmanager
    def get_connection(self):
        """Get a database connection from the pool"""
        conn = None
        try:
            if self.pool:
                conn = self.pool.getconn()
                yield conn
            else:
                raise Exception("Database pool not initialized")
        except Exception as e:
            logger.error(f"Error getting database connection: {e}")
            raise
        finally:
            if conn and self.pool:
                self.pool.putconn(conn)
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as list of dicts"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params)
                    results = cursor.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            raise
    
    def execute_command(self, command: str, params: Optional[tuple] = None) -> int:
        """Execute an INSERT/UPDATE/DELETE command and return affected row count"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(command, params)
                    conn.commit()
                    return cursor.rowcount
        except Exception as e:
            logger.error(f"Error executing command: {e}")
            logger.error(f"Command: {command}")
            logger.error(f"Params: {params}")
            raise
    
    def execute_many(self, command: str, params_list: List[tuple]) -> int:
        """Execute multiple commands with different parameters"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.executemany(command, params_list)
                    conn.commit()
                    return cursor.rowcount
        except Exception as e:
            logger.error(f"Error executing many commands: {e}")
            raise
    
    def execute_insert_returning(self, command: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute an INSERT/UPDATE command with RETURNING clause and return results"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(command, params)
                    conn.commit()
                    results = cursor.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error executing insert with returning: {e}")
            logger.error(f"Command: {command}")
            logger.error(f"Params: {params}")
            raise
    
    def close(self):
        """Close the connection pool"""
        if self.pool:
            self.pool.closeall()
            logger.info("Database pool closed")

# Global database manager instance
db_manager = DatabaseManager()

def get_db() -> DatabaseManager:
    """Get the global database manager instance"""
    return db_manager
