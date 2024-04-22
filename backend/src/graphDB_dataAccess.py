import logging
import os
from datetime import datetime
from langchain_community.graphs import Neo4jGraph
from src.api_response import create_api_response
from src.entities.source_node import sourceNode

class graphDBdataAccess:

    def __init__(self, graph: Neo4jGraph):
        self.graph = graph

    def update_exception_db(self, file_name, exp_msg):
        try:
            job_status = "Failed"
            self.graph.query("""MERGE(d:Document {fileName :$fName}) SET d.status = $status, d.errorMessage = $error_msg""",
                            {"fName":file_name, "status":job_status, "error_msg":exp_msg})
        except Exception as e:
            error_message = str(e)
            logging.error(f"Error in updating document node status as failed: {error_message}")
            raise Exception(error_message)
        
    def create_source_node(self, obj_source_node:sourceNode):
        try:
            job_status = "New"
            logging.info("create source node as file name if not exist")
            self.graph.query("""MERGE(d:Document {fileName :$fn}) SET d.fileSize = $fs, d.fileType = $ft ,
                            d.status = $st, d.url = $url, d.awsAccessKeyId = $awsacc_key_id, 
                            d.fileSource = $f_source, d.createdAt = $c_at, d.updatedAt = $u_at, 
                            d.processingTime = $pt, d.errorMessage = $e_message, d.nodeCount= $n_count, 
                            d.relationshipCount = $r_count, d.model= $model, d.gcsBucket=$gcs_bucket, 
                            d.gcsBucketFolder= $gcs_bucket_folder""",
                            {"fn":obj_source_node.file_name, "fs":obj_source_node.file_size, "ft":obj_source_node.file_type, "st":job_status, 
                            "url":obj_source_node.url,
                            "awsacc_key_id":obj_source_node.awsAccessKeyId, "f_source":obj_source_node.file_source, "c_at":obj_source_node.created_at,
                            "u_at":obj_source_node.created_at, "pt":0, "e_message":'', "n_count":0, "r_count":0, "model":obj_source_node.model,
                            "gcs_bucket": obj_source_node.gcsBucket, "gcs_bucket_folder": obj_source_node.gcsBucketFolder})
        except Exception as e:
            error_message = str(e)
            self.update_exception_db(self, obj_source_node.file_name, error_message)
            raise Exception(error_message)
        
    def update_source_node(self, obj_source_node:sourceNode):
        try:
            processed_time = obj_source_node.updated_at - obj_source_node.created_at
            logging.info("Update source node properties")
            self.graph.query("""MERGE(d:Document {fileName :$fn}) SET d.status = $st, d.createdAt = $c_at, 
                            d.updatedAt = $u_at, d.processingTime = $pt, d.nodeCount= $n_count, 
                            d.relationshipCount = $r_count, d.model= $model
                        """,
                        {"fn":obj_source_node.file_name, "st":obj_source_node.status, "c_at":obj_source_node.created_at,
                        "u_at":obj_source_node.updated_at, "pt":round(processed_time.total_seconds(),2), "e_message":'',
                        "n_count":obj_source_node.node_count, "r_count":obj_source_node.relationship_count, "model":obj_source_node.model
                        }
                        )
        except Exception as e:
            error_message = str(e)
            self.update_exception_db(self.file_name,error_message)
            raise Exception(error_message)
    
    def get_source_list(self):
        """
        Args:
            uri: URI of the graph to extract
            db_name: db_name is database name to connect to graph db
            userName: Username to use for graph creation ( if None will use username from config file )
            password: Password to use for graph creation ( if None will use password from config file )
            file: File object containing the PDF file to be used
            model: Type of model to use ('Diffbot'or'OpenAI GPT')
        Returns:
        Returns a list of sources that are in the database by querying the graph and
        sorting the list by the last updated date. 
        """
        logging.info("Get existing files list from graph")
        query = "MATCH(d:Document) WHERE d.fileName IS NOT NULL RETURN d ORDER BY d.updatedAt DESC"
        result = self.graph.query(query)
        list_of_json_objects = [entry['d'] for entry in result]
        return list_of_json_objects
        
    def update_KNN_graph(self):
        """
        Update the graph node with SIMILAR relationship where embedding scrore match
        """
        index = self.graph.query("""show indexes yield * where type = 'VECTOR' and name = 'vector'""")
        # logging.info(f'show index vector: {index}')
        knn_min_score = os.environ.get('KNN_MIN_SCORE')
        if index[0]['name'] == 'vector':
            logging.info('update KNN graph')
            result = self.graph.query("""MATCH (c:Chunk)
                                    WHERE c.embedding IS NOT NULL AND count { (c)-[:SIMILAR]-() } < 5
                                    CALL db.index.vector.queryNodes('vector', 6, c.embedding) yield node, score
                                    WHERE node <> c and score >= $score MERGE (c)-[rel:SIMILAR]-(node) SET rel.score = score
                                """,
                                {"score":float(knn_min_score)}
                                )
            logging.info(f"result : {result}")
            
    def connection_check(self):
        """
        Args:
            uri: URI of the graph to extract
            userName: Username to use for graph creation ( if None will use username from config file )
            password: Password to use for graph creation ( if None will use password from config file )
            db_name: db_name is database name to connect to graph db
        Returns:
        Returns a status of connection from NEO4j is success or failure
        """
        if self.graph:
            return "Connection Successful"

    def execute_query(self, query, param):
        return self.graph.query(query, param)
