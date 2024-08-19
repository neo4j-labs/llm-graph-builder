import os
from langchain_community.graphs import Neo4jGraph
from graphdatascience import GraphDataScience
import pandas as pd
import numpy as np
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from src.llm import get_llm

import os
import getpass
from neo4j import GraphDatabase, Result
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import tiktoken
import numpy as np
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Neo4jVector
from langchain_community.graphs import Neo4jGraph
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from tqdm import tqdm
from src.shared.common_fn import load_embedding_model


from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from src.llm import get_llm 

import logging
from graphdatascience import GraphDataScience

COMMUNITY_PROJECT_NAME = "communities"
NODE_PROJECTION = "__Entity__"
CREATE_COMMUNITY_CONSTRAINT = "CREATE CONSTRAINT IF NOT EXISTS FOR (c:__Community__) REQUIRE c.id IS UNIQUE;"

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

def create_community_graph_project(gds, project_name=COMMUNITY_PROJECT_NAME, node_projection=NODE_PROJECTION):
    try:
        existing_projects = gds.graph.list()
        project_exists = existing_projects["graphName"].str.contains(project_name, regex=False).any()
        
        if project_exists:
            logging.info(f"Project '{project_name}' already exists. Dropping it.")
            gds.graph.drop(project_name)
        
        logging.info(f"Creating new graph project '{project_name}'.")
        graph_project, result = gds.graph.project(
            project_name, 
            node_projection,
            {
                "_ALL_": {
                    "type": "*",
                    "orientation": "UNDIRECTED",
                    "properties": {
                        "weight": {
                            "property": "*", 
                            "aggregation": "COUNT"
                        }
                    }
                }
            }
        )
        logging.info(f"Graph project '{project_name}' created successfully.")
        return graph_project, result
    except Exception as e:
        logging.error(f"Failed to create community graph project: {e}")
        raise

def write_communities(gds, graph_project, project_name=COMMUNITY_PROJECT_NAME):
    try:
        logging.info(f"Writing communities to the graph project '{project_name}'.")
        gds.leiden.write(
            graph_project,
            writeProperty=project_name,
            includeIntermediateCommunities=True,
            relationshipWeightProperty="weight"
        )
        logging.info("Communities written successfully.")
        return True
    except Exception as e:
        logging.error(f"Failed to write communities: {e}")
        return False




def create_communities(uri, username, password, database,graph):
    try:
        gds = get_gds_driver(uri, username, password, database)
        graph_project, result = create_community_graph_project(gds)
        
        if write_communities(gds, graph_project):
            logging.info("Applying community constraint to the graph.")
            graph.query(CREATE_COMMUNITY_CONSTRAINT)
            # Optionally, you can call create_community_properties() here if needed
            logging.info("Communities creation process completed successfully.")
        else:
            logging.warning("Failed to write communities. Constraint was not applied.")
    except Exception as e:
        logging.error(f"Failed to create communities: {e}")



# def create_communities(uri,username,password,database,graph):
#     gds = get_gds_driver(uri,username,password,database)
#     graph_project,result =  create_community_graph_project(gds)
#     result1 = write_communities(gds,graph_project)
#     if result1:
#         graph.query(CREATE_COMMUNITY_CONSTRAINT)
#         # create_community_properties()
    





