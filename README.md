
# Knowledge Graph Builder App

## Technical Documentation

In the root directory:

### Run development

To develop all apps and packages, run the following command:

```bash
docker-compose up --build
```

You can also run only a specific directory with

```bash
cd frontend
yarn 
yarn run dev
```

and 

```bash
cd backend
python -m venv 'envName'
source envName/bin/activate 
pip install -r requirements.txt
uvicorn score:app --reload
```

### Build

To build all apps and packages, run the following command:

```bash
# Frontend build outputs to `apps/frontend/dist` folder.
yarn build
```
```bash
# Backend build outputs to .
```

###
To deploy the app and packages, run the following command on google cloud run:
```bash
# Frontend deploy 
gcloud run deploy 
source location current directory > Frontend
region : 32 [us-central 1]
Allow unauthenticated request : Yes
```
```bash
# Backend deploy 
gcloud run deploy --set-env-vars "OPENAI_API_KEY = " --set-env-vars "DIFFBOT_API_KEY = " --set-env-vars "NEO4J_URI = " --set-env-vars "NEO4J_PASSWORD = "
source location current directory > Backend
region : 32 [us-central 1]
Allow unauthenticated request : Yes
```
### Features
Features deployed:
- Connection to Neo4+j Database
- File Upload from Drop zone and S3 bucket.
- Grid View of source node files with : Name,Type,Size,Nodes,Relations,Duration,Status,Source,Model

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
   
    Args:
        graph: Neo4j graph object
    Returns:
         Returns a list of sources that are in the database by querying the graph and 
         sorting the list by the last updated date. 

# create_source_node_graph(uri, userName, password, file):

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
