
# Knowledge Graph Builder App
This application is designed to convert PDF documents into a knowledge graph stored in Neo4j. It utilizes the power of OpenAI's GPT/Diffbot LLM(Large language model) to extract nodes, relationships and properties from the text content of the PDF and then organizes them into a structured knowledge graph using Langchain framework. 
Files can be uploaded from local machine or S3 bucket and then LLM model can be chosen to create the knowledge graph.

### Getting started

1. Run Docker Compose to build and start all components:
    ```bash
    docker-compose up --build
    ```

2. Alternatively, you can run specific directories separately:

    - For the frontend:
        ```bash
        cd frontend
        yarn
        yarn run dev
        ```

    - For the backend:
        ```bash
        cd backend
        python -m venv envName
        source envName/bin/activate 
        pip install -r requirements.txt
        uvicorn score:app --reload
        ```

###
To deploy the app and packages on Google Cloud Platform, run the following command on google cloud run:
```bash
# Frontend deploy 
gcloud run deploy 
source location current directory > Frontend
region : 32 [us-central 1]
Allow unauthenticated request : Yes
```
```bash
# Backend deploy 
gcloud run deploy --set-env-vars "OPENAI_API_KEY = " --set-env-vars "DIFFBOT_API_KEY = " --set-env-vars "NEO4J_URI = " --set-env-vars "NEO4J_PASSWORD = " --set-env-vars "NEO4J_USERNAME = "
source location current directory > Backend
region : 32 [us-central 1]
Allow unauthenticated request : Yes
```
### Features
- **PDF Upload**: Users can upload PDF documents using the Drop Zone.
- **S3 Bucket Integration**: Users can also specify PDF documents stored in an S3 bucket for processing.
- **Knowledge Graph Generation**: The application employs OpenAI/Diffbot's LLM to extract relevant information from the PDFs and construct a knowledge graph.
- **Neo4j Integration**: The extracted nodes and relationships are stored in a Neo4j database for easy visualization and querying.
- **Grid View of source node files with** : Name,Type,Size,Nodes,Relations,Duration,Status,Source,Model
  
## Setting up Environment Variables
Create .env file and update the following env variables.\
OPENAI_API_KEY = ""\
DIFFBOT_API_KEY = ""\
NEO4J_URI = ""\
NEO4J_USERNAME = ""\
NEO4J_PASSWORD = ""\
AWS_ACCESS_KEY_ID =  ""\
AWS_SECRET_ACCESS_KEY = ""\
EMBEDDING_MODEL = ""\
IS_EMBEDDING = "TRUE"
KNN_MIN_SCORE = ""\

## Functions/Modules

#### extract_graph_from_file(uri, userName, password, file_path, model):
   Extracts nodes , relationships and properties from a PDF file leveraging LLM models.
   
    Args:
   	 uri: URI of the graph to extract
   	 userName: Username to use for graph creation ( if None will use username from config file )
   	 password: Password to use for graph creation ( if None will use password from config file )
   	 file: File object containing the PDF file path to be used
   	 model: Type of model to use ('OpenAI GPT 3.5' or 'OpenAI GPT 4')
   
     Returns: 
   	 Json response to API with fileName, nodeCount, relationshipCount, processingTime, 
     status and model as attributes.

#### get_source_list_from_graph(graph):
   
   Creates a list of sources
   
    Args:
        graph: Neo4j graph object
    Returns:
         Returns a list of sources that are in the database by querying the graph and 
         sorting the list by the last updated date. 

#### create_source_node_graph(uri, userName, password, file):

   Creates a source node in Neo4jGraph and sets properties.
   
    Args:
   	 uri: URI of Graph Service to connect to
   	 userName: Username to connect to Graph Service with ( default : None )
   	 password: Password to connect to Graph Service with ( default : None )
   	 file: File object with information about file to be added
   
    Returns: 
   	 Success or Failure message of node creation


## Links
 The Public [ Google cloud Run URL](https://frontend-dcavk67s4a-uc.a.run.app).
 [Workspace URL](https://workspace-preview.neo4j.io/workspace)
