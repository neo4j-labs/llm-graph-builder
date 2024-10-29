# Knowledge Graph Builder App

Creating knowledge graphs from unstructured data


# LLM Graph Builder

![Python](https://img.shields.io/badge/Python-yellow)
![FastAPI](https://img.shields.io/badge/FastAPI-green)
![React](https://img.shields.io/badge/React-blue)

## Overview
This application is designed to turn Unstructured data (pdfs,docs,txt,youtube video,web pages,etc.) into a knowledge graph stored in Neo4j. It utilizes the power of Large language models (OpenAI,Gemini,etc.) to extract nodes, relationships and their properties from the text and create a structured knowledge graph using Langchain framework. 

Upload your files from local machine, GCS or S3 bucket or from web sources, choose your LLM model and generate knowledge graph.

## Key Features
- **Knowledge Graph Creation**: Transform unstructured data into structured knowledge graphs using LLMs.
- **Providing Schema**: Provide your own custom schema or use existing schema in settings to generate graph.
- **View Graph**: View graph for a particular source or multiple sources at a time in Bloom.
- **Chat with Data**: Interact with your data in a Neo4j database through conversational queries, also retrive metadata about the source of response to your queries. 

## Getting started

:warning: You will need to have a Neo4j Database V5.15 or later with [APOC installed](https://neo4j.com/docs/apoc/current/installation/) to use this Knowledge Graph Builder.
You can use any [Neo4j Aura database](https://neo4j.com/aura/) (including the free database)
If you are using Neo4j Desktop, you will not be able to use the docker-compose but will have to follow the [separate deployment of backend and frontend section](#running-backend-and-frontend-separately-dev-environment). :warning:


## Deployment
### Local deployment
#### Running through docker-compose
By default only OpenAI and Diffbot are enabled since Gemini requires extra GCP configurations.
Accoroding to enviornment we are configuring the models which is indicated by VITE_LLM_MODELS_PROD variable we can configure model based on our need.
EX:
```env
VITE_LLM_MODELS_PROD="openai_gpt_4o,openai_gpt_4o_mini,diffbot,gemini_1.5_flash"
```

In your root folder, create a .env file with your OPENAI and DIFFBOT keys (if you want to use both):
```env
OPENAI_API_KEY="your-openai-key"
DIFFBOT_API_KEY="your-diffbot-key"
```

if you only want OpenAI:
```env
VITE_LLM_MODELS_PROD="diffbot,openai-gpt-3.5,openai-gpt-4o"
OPENAI_API_KEY="your-openai-key"
```

if you only want Diffbot:
```env
VITE_LLM_MODELS_PROD="diffbot"
DIFFBOT_API_KEY="your-diffbot-key"
```

You can then run Docker Compose to build and start all components:
```bash
docker-compose up --build
```

#### Additional configs

By default, the input sources will be: Local files, Youtube, Wikipedia ,AWS S3 and Webpages. As this default config is applied:
```env
VITE_REACT_APP_SOURCES="local,youtube,wiki,s3,web"
```

If however you want the Google GCS integration, add `gcs` and your Google client ID:
```env
VITE_REACT_APP_SOURCES="local,youtube,wiki,s3,gcs,web"
VITE_GOOGLE_CLIENT_ID="xxxx"
```

You can of course combine all (local, youtube, wikipedia, s3 and gcs) or remove any you don't want/need.

### Chat Modes

By default,all of the chat modes will be available: vector, graph_vector, graph, fulltext, graph_vector_fulltext , entity_vector and global_vector.
If none of the mode is mentioned in the chat modes variable all modes will be available:
```env
VITE_CHAT_MODES=""
```

If however you want to specify the only vector mode or only graph mode you can do that by specifying the mode in the env:
```env
VITE_CHAT_MODES="vector,graph"
```

#### Running Backend and Frontend separately (dev environment)
Alternatively, you can run the backend and frontend separately:

- For the frontend:
1. Create the frontend/.env file by copy/pasting the frontend/example.env.
2. Change values as needed
3.
    ```bash
    cd frontend
    yarn
    yarn run dev
    ```

- For the backend:
1. Create the backend/.env file by copy/pasting the backend/example.env.
2. Change values as needed
3.
    ```bash
    cd backend
    python -m venv envName
    source envName/bin/activate 
    pip install -r requirements.txt
    uvicorn score:app --reload
    ```
### Deploy in Cloud
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

## ENV
| Env Variable Name       | Mandatory/Optional | Default Value | Description                                                                                      |
|-------------------------|--------------------|---------------|--------------------------------------------------------------------------------------------------|
| EMBEDDING_MODEL         | Optional           | all-MiniLM-L6-v2 | Model for generating the text embedding (all-MiniLM-L6-v2 , openai , vertexai)                |
| IS_EMBEDDING            | Optional           | true          | Flag to enable text embedding                                                                    |
| KNN_MIN_SCORE           | Optional           | 0.94          | Minimum score for KNN algorithm                                                                  |
| GEMINI_ENABLED          | Optional           | False         | Flag to enable Gemini                                                                             |
| GCP_LOG_METRICS_ENABLED | Optional           | False         | Flag to enable Google Cloud logs                                                                 |
| NUMBER_OF_CHUNKS_TO_COMBINE | Optional       | 5             | Number of chunks to combine when processing embeddings                                           |
| UPDATE_GRAPH_CHUNKS_PROCESSED | Optional     | 20            | Number of chunks processed before updating progress                                        |
| NEO4J_URI               | Optional           | neo4j://database:7687 | URI for Neo4j database                                                                  |
| NEO4J_USERNAME          | Optional           | neo4j         | Username for Neo4j database                                                                       |
| NEO4J_PASSWORD          | Optional           | password      | Password for Neo4j database                                                                       |
| LANGCHAIN_API_KEY       | Optional           |               | API key for Langchain                                                                             |
| LANGCHAIN_PROJECT       | Optional           |               | Project for Langchain                                                                             |
| LANGCHAIN_TRACING_V2    | Optional           | true          | Flag to enable Langchain tracing                                                                  |
| LANGCHAIN_ENDPOINT      | Optional           | https://api.smith.langchain.com | Endpoint for Langchain API                                                            |
| VITE_BACKEND_API_URL         | Optional           | http://localhost:8000 | URL for backend API                                                                       |
| VITE_BLOOM_URL               | Optional           | https://workspace-preview.neo4j.io/workspace/explore?connectURL={CONNECT_URL}&search=Show+me+a+graph&featureGenAISuggestions=true&featureGenAISuggestionsInternal=true | URL for Bloom visualization |
| VITE_REACT_APP_SOURCES       | Mandatory          | local,youtube,wiki,s3 | List of input sources that will be available                                               |
| VITE_CHAT_MODES              | Mandatory          | vector,graph+vector,graph,hybrid | Chat modes available for Q&A
| VITE_ENV                     | Mandatory          | DEV or PROD           | Environment variable for the app                                                                 |
| VITE_TIME_PER_PAGE          | Optional           | 50             | Time per page for processing                                                                    |
| VITE_CHUNK_SIZE              | Optional           | 5242880       | Size of each chunk of file for upload                                                                |
| VITE_GOOGLE_CLIENT_ID        | Optional           |               | Client ID for Google authentication                                                              |
| VITE_LLM_MODELS_PROD         | Optional      | openai_gpt_4o,openai_gpt_4o_mini,diffbot,gemini_1.5_flash | To Distinguish models based on the Enviornment PROD or DEV 
| GCS_FILE_CACHE          | Optional           | False         | If set to True, will save the files to process into GCS. If set to False, will save the files locally   |
| ENTITY_EMBEDDING        | Optional           | False         | If set to True, It will add embeddings for each entity in database |
| LLM_MODEL_CONFIG_ollama_<model_name>         | Optional      |               | Set ollama config as - model_name,model_local_url for local deployments |
| RAGAS_EMBEDDING_MODEL         | Optional      | openai              | embedding model used by ragas evaluation framework                               |



## For local llms (Ollama)
1. Pull the docker imgage of ollama
```bash
docker pull ollama/ollama
```
2. Run the ollama docker image
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
3. Execute any llm model ex🦙3
```bash
docker exec -it ollama ollama run llama3
```
4. Configure  env variable in docker compose or backend enviournment.
```env
LLM_MODEL_CONFIG_ollama_<model_name>
#example
LLM_MODEL_CONFIG_ollama_llama3=${LLM_MODEL_CONFIG_ollama_llama3-llama3,
http://host.docker.internal:11434}
```
5. Configure the backend API url
```env
VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL-backendurl}
```
6. Open the application in browser and select the ollama model for the extraction.
7. Enjoy Graph Building.


## Usage
1. Connect to Neo4j Aura Instance by passing URI and password or using Neo4j credentials file.
2. Choose your source from a list of Unstructured sources to create graph.
3. Change the LLM (if required) from drop down, which will be used to generate graph.
4. Optionally, define schema(nodes and relationship labels) in entity graph extraction settings.
5. Either select multiple files to 'Generate Graph' or all the files in 'New' status will be processed for graph creation.
6. Have a look at the graph for individial files using 'View' in grid or select one or more files and 'Preview Graph'
7. Ask questions related to the processed/completed sources to chat-bot, Also get detailed information about your answers generated by LLM.

## Links

[LLM Knowledge Graph Builder Application](https://llm-graph-builder.neo4jlabs.com/)

[Neo4j Workspace](https://workspace-preview.neo4j.io/workspace/query)

## Reference

[Demo of application](https://www.youtube.com/watch?v=LlNy5VmV290)

## Contact
For any inquiries or support, feel free to raise [Github Issue](https://github.com/neo4j-labs/llm-graph-builder/issues)


## Happy Graph Building!
