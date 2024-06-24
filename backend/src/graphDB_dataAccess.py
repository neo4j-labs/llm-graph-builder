import logging
import os
from datetime import datetime
from langchain_community.graphs import Neo4jGraph
from src.shared.common_fn import create_gcs_bucket_folder_name_hashed, delete_uploaded_local_file
from src.document_sources.gcs_bucket import delete_file_from_gcs
from src.shared.constants import BUCKET_UPLOAD
from src.entities.source_node import sourceNode
import json

class graphDBdataAccess:

    def __init__(self, graph: Neo4jGraph):
        self.graph = graph

    def update_exception_db(self, file_name, exp_msg):
        try:
            job_status = "Failed"
            result = self.get_current_status_document_node(file_name)
            is_cancelled_status = result[0]['is_cancelled']
            if bool(is_cancelled_status) == True:
                job_status = 'Cancelled'
            self.graph.query("""MERGE(d:Document {fileName :$fName}) SET d.status = $status, d.errorMessage = $error_msg""",
                            {"fName":file_name, "status":job_status, "error_msg":exp_msg})
        except Exception as e:
            error_message = str(e)
            logging.error(f"Error in updating document node status as failed: {error_message}")
            raise Exception(error_message)
        
    def create_source_node(self, obj_source_node:sourceNode):
        try:
            job_status = "New"
            logging.info("creating source node if does not exist")
            self.graph.query("""MERGE(d:Document {fileName :$fn}) SET d.fileSize = $fs, d.fileType = $ft ,
                            d.status = $st, d.url = $url, d.awsAccessKeyId = $awsacc_key_id, 
                            d.fileSource = $f_source, d.createdAt = $c_at, d.updatedAt = $u_at, 
                            d.processingTime = $pt, d.errorMessage = $e_message, d.nodeCount= $n_count, 
                            d.relationshipCount = $r_count, d.model= $model, d.gcsBucket=$gcs_bucket, 
                            d.gcsBucketFolder= $gcs_bucket_folder, d.language= $language,d.gcsProjectId= $gcs_project_id,
                            d.is_cancelled=False, d.total_chunks=0, d.processed_chunk=0, d.total_pages=$total_pages,
                            d.access_token=$access_token""",
                            {"fn":obj_source_node.file_name, "fs":obj_source_node.file_size, "ft":obj_source_node.file_type, "st":job_status, 
                            "url":obj_source_node.url,
                            "awsacc_key_id":obj_source_node.awsAccessKeyId, "f_source":obj_source_node.file_source, "c_at":obj_source_node.created_at,
                            "u_at":obj_source_node.created_at, "pt":0, "e_message":'', "n_count":0, "r_count":0, "model":obj_source_node.model,
                            "gcs_bucket": obj_source_node.gcsBucket, "gcs_bucket_folder": obj_source_node.gcsBucketFolder, 
                            "language":obj_source_node.language, "gcs_project_id":obj_source_node.gcsProjectId, "total_pages": obj_source_node.total_pages,
                            "access_token":obj_source_node.access_token})
        except Exception as e:
            error_message = str(e)
            logging.info(f"error_message = {error_message}")
            self.update_exception_db(self, obj_source_node.file_name, error_message)
            raise Exception(error_message)
        
    def update_source_node(self, obj_source_node:sourceNode):
        try:

            params = {}
            if obj_source_node.file_name is not None and obj_source_node.file_name != '':
                params['fileName'] = obj_source_node.file_name

            if obj_source_node.status is not None and obj_source_node.status != '':
                params['status'] = obj_source_node.status

            if obj_source_node.created_at is not None:
                params['createdAt'] = obj_source_node.created_at

            if obj_source_node.updated_at is not None:
                params['updatedAt'] = obj_source_node.updated_at

            if obj_source_node.processing_time is not None and obj_source_node.processing_time != 0:
                params['processingTime'] = round(obj_source_node.processing_time.total_seconds(),2)

            if obj_source_node.node_count is not None and obj_source_node.node_count != 0:
                params['nodeCount'] = obj_source_node.node_count

            if obj_source_node.relationship_count is not None and obj_source_node.relationship_count != 0:
                params['relationshipCount'] = obj_source_node.relationship_count

            if obj_source_node.model is not None and obj_source_node.model != '':
                params['model'] = obj_source_node.model

            if obj_source_node.total_pages is not None and obj_source_node.total_pages != 0:
                params['total_pages'] = obj_source_node.total_pages

            if obj_source_node.total_chunks is not None and obj_source_node.total_chunks != 0:
                params['total_chunks'] = obj_source_node.total_chunks

            if obj_source_node.is_cancelled is not None and obj_source_node.is_cancelled != False:
                params['is_cancelled'] = obj_source_node.is_cancelled

            if obj_source_node.processed_chunk is not None and obj_source_node.processed_chunk != 0:
                params['processed_chunk'] = obj_source_node.processed_chunk

            param= {"props":params}
            
            print(f'Base Param value 1 : {param}')
            query = "MERGE(d:Document {fileName :$props.fileName}) SET d += $props"
            logging.info("Update source node properties")
            self.graph.query(query,param)
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
        if len(index) > 0:
            logging.info('update KNN graph')
            self.graph.query("""MATCH (c:Chunk)
                                    WHERE c.embedding IS NOT NULL AND count { (c)-[:SIMILAR]-() } < 5
                                    CALL db.index.vector.queryNodes('vector', 6, c.embedding) yield node, score
                                    WHERE node <> c and score >= $score MERGE (c)-[rel:SIMILAR]-(node) SET rel.score = score
                                """,
                                {"score":float(knn_min_score)}
                                )
        else:
            logging.info("Vector index does not exist, So KNN graph not update")
            
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

    def execute_query(self, query, param=None):
        return self.graph.query(query, param)

    def get_current_status_document_node(self, file_name):
        query = """
                MATCH(d:Document {fileName : $file_name}) RETURN d.status AS Status , d.processingTime AS processingTime, 
                d.nodeCount AS nodeCount, d.model as model, d.relationshipCount as relationshipCount,
                d.total_pages AS total_pages, d.total_chunks AS total_chunks , d.fileSize as fileSize, 
                d.is_cancelled as is_cancelled, d.processed_chunk as processed_chunk, d.fileSource as fileSource
                """
        param = {"file_name" : file_name}
        return self.execute_query(query, param)
    
    def delete_file_from_graph(self, filenames, source_types, deleteEntities:str, merged_dir:str, uri):
        # filename_list = filenames.split(',')
        filename_list= list(map(str.strip, json.loads(filenames)))
        source_types_list= list(map(str.strip, json.loads(source_types)))
        gcs_file_cache = os.environ.get('GCS_FILE_CACHE')
        # source_types_list = source_types.split(',')
        for (file_name,source_type) in zip(filename_list, source_types_list):
            merged_file_path = os.path.join(merged_dir, file_name)
            if source_type == 'local file' and gcs_file_cache == 'True':
                folder_name = create_gcs_bucket_folder_name_hashed(uri, file_name)
                delete_file_from_gcs(BUCKET_UPLOAD,folder_name,file_name)
            else:
                logging.info(f'Deleted File Path: {merged_file_path} and Deleted File Name : {file_name}')
                delete_uploaded_local_file(merged_file_path,file_name)
        query_to_delete_document=""" 
           MATCH (d:Document) where d.fileName in $filename_list and d.fileSource in $source_types_list
            with collect(d) as documents 
            unwind documents as d
            optional match (d)<-[:PART_OF]-(c:Chunk) 
            detach delete c, d
            return count(*) as deletedChunks
            """
        query_to_delete_document_and_entities=""" 
            MATCH (d:Document) where d.fileName in $filename_list and d.fileSource in $source_types_list
            with collect(d) as documents 
            unwind documents as d
            optional match (d)<-[:PART_OF]-(c:Chunk)
            // if delete-entities checkbox is set
            call { with  c, documents
                match (c)-[:HAS_ENTITY]->(e)
                // belongs to another document
                where not exists {  (d2)<-[:PART_OF]-()-[:HAS_ENTITY]->(e) WHERE NOT d2 IN documents }
                detach delete e
                return count(*) as entities
            } 
            detach delete c, d
            return sum(entities) as deletedEntities, count(*) as deletedChunks
            """    
        param = {"filename_list" : filename_list, "source_types_list": source_types_list}
        if deleteEntities == "true":
            result = self.execute_query(query_to_delete_document_and_entities, param)
            logging.info(f"Deleting {len(filename_list)} documents = '{filename_list}' from '{source_types_list}' from database")
        else :
            result = self.execute_query(query_to_delete_document, param)    
            logging.info(f"Deleting {len(filename_list)} documents = '{filename_list}' from '{source_types_list}' with their entities from database")
        
        return result, len(filename_list)    