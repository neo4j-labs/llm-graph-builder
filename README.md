# llm_graph_transformer

## Purpose
The 'llm_graph_transformer' package enables the generation of knowledge graphs in a Neo4j workspace using OpenAI's GPT.

## Installation
Using Poetry is a more streamlined way to manage Python dependencies and projects. To manage python dependencies in 'pyproject.toml' file install Poetry using the following command:

curl -sSL https://install.python-poetry.org | python3 -

Install Dependencies specified in the 'pyproject.toml' file using the command:

poetry install


## Setting up Environment Variables
Create .env file and update the following env variables
OPENAI_API_KEY = ""\
NEO4J_URI = ""\
NEO4J_USERNAME = ""\
NEO4J_PASSWORD = ""\
LLM_MODEL="<OpenAI GPT 3.5> or <OPENAI GPT 4>"

## Importing Modules
To import modules and functions from 'llm_graph_transformer.openaillm', you can use the following import statement:

from llm_graph_transformer.openaillm import *

## Functions/Modules

# extract_graph_from_file(uri, userName, password, file_path, model):
   Extracts a Neo4jGraph from a PDF file based on the model.
   
    Args:
   	 uri: URI of the graph to extract
   	 userName: Username to use for graph creation ( if None will use username from config file )
   	 password: Password to use for graph creation ( if None will use password from config file )
   	 file: File object containing the PDF file path to be used
   	 model: Type of model to use ('OpenAI GPT 3.5' or 'OpenAI GPT 4')
   
     Returns: 
   	 Json response to API with fileName, nodeCount, relationshipCount, processingTime, 
     status and model as attributes.

# get_source_list_from_graph(graph):
   
   Creates a list of sources
