
# Knowledge Graph Builder
![Python](https://img.shields.io/badge/Python-yellow)
![FastAPI](https://img.shields.io/badge/FastAPI-green)
![React](https://img.shields.io/badge/React-blue)

Transform unstructured data (PDFs, DOCs, TXT, YouTube videos, web pages, etc.) into a structured Knowledge Graph stored in Neo4j using the power of Large Language Models (LLMs) and the LangChain framework.

This application allows you to upload files from various sources (local machine, GCS, S3 bucket, or web sources), choose your preferred LLM model, and generate a Knowledge Graph. 

---

## Key Features

### **Knowledge Graph Creation**
- Seamlessly transform unstructured data into structured Knowledge Graphs using advanced LLMs.
- Extract nodes, relationships, and their properties to create structured graphs.

### **Schema Support**
- Use a custom schema or existing schemas configured in the settings to generate graphs.

### **Graph Visualization**
- View graphs for specific or multiple data sources simultaneously in **Neo4j Bloom**.

### **Chat with Data**
- Interact with your data in the Neo4j database through conversational queries.
- Retrieve metadata about the source of responses to your queries.
- For a dedicated chat interface, use the standalone chat application with **[Chat-Only](/chat-only).** route

---

## Getting Started

### **Prerequisites**
- Neo4j Database **5.23 or later** with APOC installed.
  - **Neo4j Aura** databases (including the free tier) are supported.
  - If using **Neo4j Desktop**, you will need to deploy the backend and frontend separately (docker-compose is not supported).

---

## Deployment Options

### **Local Deployment**

#### Using Docker-Compose
Run the application using the default `docker-compose` configuration.

1. **Supported LLM Models**: 
   - By default, only OpenAI and Diffbot are enabled. Gemini requires additional GCP configurations. 
   - Use the `VITE_LLM_MODELS_PROD` variable to configure the models you need. Example:
     ```bash
     VITE_LLM_MODELS_PROD="openai_gpt_4o,openai_gpt_4o_mini,diffbot,gemini_1.5_flash"
     ```

2. **Input Sources**: 
   - By default, the following sources are enabled: `local`, `YouTube`, `Wikipedia`, `AWS S3`, and `web`. 
   - To add Google Cloud Storage (GCS) integration, include `gcs` and your Google client ID:
     ```bash
     VITE_REACT_APP_SOURCES="local,youtube,wiki,s3,gcs,web"
     VITE_GOOGLE_CLIENT_ID="your-google-client-id"
     ```

#### Chat Modes
Configure chat modes using the `VITE_CHAT_MODES` variable:
- By default, all modes are enabled: `vector`, `graph_vector`, `graph`, `fulltext`, `graph_vector_fulltext`, `entity_vector`, and `global_vector`. 
- To specify specific modes, update the variable. For example:
  ```bash
  VITE_CHAT_MODES="vector,graph"
  ```

---

### **Running Backend and Frontend Separately**

For development, you can run the backend and frontend independently.

#### **Frontend Setup**
1. Create the `.env` file in the `frontend` folder by copying `frontend/example.env`.
2. Update environment variables as needed.
3. Run:
   ```bash
   cd frontend
   yarn
   yarn run dev
   ```

#### **Backend Setup**
1. Create the `.env` file in the `backend` folder by copying `backend/example.env`.
2. Preconfigure user credentials in the `.env` file to bypass the login dialog:
   ```bash
   NEO4J_URI=<your-neo4j-uri>
   NEO4J_USERNAME=<your-username>
   NEO4J_PASSWORD=<your-password>
   NEO4J_DATABASE=<your-database-name>
   ```
3. Run:
   ```bash
   cd backend
   python -m venv envName
   source envName/bin/activate
   pip install -r requirements.txt
   uvicorn score:app --reload
   ```

---

### **Cloud Deployment**

Deploy the application on **Google Cloud Platform** using the following commands:

#### **Frontend Deployment**
```bash
gcloud run deploy dev-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

#### **Backend Deployment**
```bash
gcloud run deploy dev-backend \
  --set-env-vars "OPENAI_API_KEY=<your-openai-api-key>" \
  --set-env-vars "DIFFBOT_API_KEY=<your-diffbot-api-key>" \
  --set-env-vars "NEO4J_URI=<your-neo4j-uri>" \
  --set-env-vars "NEO4J_USERNAME=<your-username>" \
  --set-env-vars "NEO4J_PASSWORD=<your-password>" \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Additional Configuration

### **LLM Models**
Configure LLM models using the `VITE_LLM_MODELS_PROD` variable. Example:
```bash
VITE_LLM_MODELS_PROD="openai_gpt_4o,openai_gpt_4o_mini,diffbot,gemini_1.5_flash"
```

### **Input Sources**
The default input sources are: `local`, `YouTube`, `Wikipedia`, `AWS S3`, and `web`. 

To enable GCS integration, include `gcs` and your Google client ID:
```bash
VITE_REACT_APP_SOURCES="local,youtube,wiki,s3,gcs,web"
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
```

---

## Support

If you encounter any issues, please feel free to open an issue or reach out to us.



## ENV
| Env Variable Name       | Mandatory/Optional | Default Value | Description                                                                                      |
|-------------------------|--------------------|---------------|--------------------------------------------------------------------------------------------------|
|                                                                                                                                                                 |
| **BACKEND ENV** 
| OPENAI_API_KEY          | Mandatory           |            |An OpenAPI Key is required to use open LLM model to authenticate andn track requests                |
| DIFFBOT_API_KEY         | Mandatory           |            |API key is required to use Diffbot's NLP service to extraction entities and relatioship from unstructured data|
| BUCKET                  | Mandatory           |            |bucket name to store uploaded file on GCS                                                           |
| NEO4J_USER_AGENT        | Optional            | llm-graph-builder        | Name of the user agent to track neo4j database activity                              |
| ENABLE_USER_AGENT       | Optional            | true       | Boolean value to enable/disable neo4j user agent                                                   |
| DUPLICATE_TEXT_DISTANCE | Mandatory            | 5 | This value used to find distance for all node pairs in the graph and calculated based on node properties    |
| DUPLICATE_SCORE_VALUE   | Mandatory            | 0.97 | Node score value to match duplicate node                                                                 |
| EFFECTIVE_SEARCH_RATIO  | Mandatory            | 1 |                 |
| GRAPH_CLEANUP_MODEL     | Optional            | 0.97 |  Model name to clean-up graph in post processing                                                           |
| MAX_TOKEN_CHUNK_SIZE    | Optional            | 10000 | Maximum token size to process file content                                                               |
| YOUTUBE_TRANSCRIPT_PROXY| Optional            |   | Proxy key to process youtube video for getting transcript                                                   |
| EMBEDDING_MODEL         | Optional            | all-MiniLM-L6-v2 | Model for generating the text embedding (all-MiniLM-L6-v2 , openai , vertexai)                |
| IS_EMBEDDING            | Optional            | true          | Flag to enable text embedding                                                                    |
| KNN_MIN_SCORE           | Optional            | 0.94          | Minimum score for KNN algorithm                                                                  |
| GEMINI_ENABLED          | Optional            | False         | Flag to enable Gemini                                                                             |
| GCP_LOG_METRICS_ENABLED | Optional            | False         | Flag to enable Google Cloud logs                                                                 |
| NUMBER_OF_CHUNKS_TO_COMBINE | Optional        | 5             | Number of chunks to combine when processing embeddings                                           |
| UPDATE_GRAPH_CHUNKS_PROCESSED | Optional      | 20            | Number of chunks processed before updating progress                                        |
| NEO4J_URI               | Optional            | neo4j://database:7687 | URI for Neo4j database                                                                  |
| NEO4J_USERNAME          | Optional            | neo4j         | Username for Neo4j database                                                                       |
| NEO4J_PASSWORD          | Optional            | password      | Password for Neo4j database                                                                       |
| LANGCHAIN_API_KEY       | Optional            |               | API key for Langchain                                                                             |
| LANGCHAIN_PROJECT       | Optional            |               | Project for Langchain                                                                             |
| LANGCHAIN_TRACING_V2    | Optional            | true          | Flag to enable Langchain tracing                                                                  |
| GCS_FILE_CACHE          | Optional            | False         | If set to True, will save the files to process into GCS. If set to False, will save the files locally   |
| LANGCHAIN_ENDPOINT      | Optional            | https://api.smith.langchain.com | Endpoint for Langchain API                                                            |
| ENTITY_EMBEDDING        | Optional            | False         | If set to True, It will add embeddings for each entity in database |
| LLM_MODEL_CONFIG_ollama_<model_name>          | Optional      |               | Set ollama config as - model_name,model_local_url for local deployments |
| RAGAS_EMBEDDING_MODEL         | Optional      | openai              | embedding model used by ragas evaluation framework                               |
|                                                                                                                                                                        |
| **FRONTEND ENV** 
| VITE_BACKEND_API_URL         | Optional           | http://localhost:8000 | URL for backend API                                                                       |
| VITE_BLOOM_URL               | Optional           | https://workspace-preview.neo4j.io/workspace/explore?connectURL={CONNECT_URL}&search=Show+me+a+graph&featureGenAISuggestions=true&featureGenAISuggestionsInternal=true | URL for Bloom visualization |
| VITE_REACT_APP_SOURCES       | Mandatory          | local,youtube,wiki,s3 | List of input sources that will be available                                               |
| VITE_CHAT_MODES              | Mandatory          | vector,graph+vector,graph,hybrid | Chat modes available for Q&A
| VITE_ENV                     | Mandatory          | DEV or PROD           | Environment variable for the app                                                                 |
| VITE_TIME_PER_PAGE          | Optional           | 50             | Time per page for processing                                                                    |
| VITE_CHUNK_SIZE              | Optional           | 5242880       | Size of each chunk of file for upload                                                                |
| VITE_GOOGLE_CLIENT_ID        | Optional           |               | Client ID for Google authentication                                                              |
| VITE_LLM_MODELS_PROD         | Optional      | openai_gpt_4o,openai_gpt_4o_mini,diffbot,gemini_1.5_flash | To Distinguish models based on the Enviornment PROD or DEV 
| VITE_LLM_MODELS              | Optional | 'diffbot,openai_gpt_3.5,openai_gpt_4o,openai_gpt_4o_mini,gemini_1.5_pro,gemini_1.5_flash,azure_ai_gpt_35,azure_ai_gpt_4o,ollama_llama3,groq_llama3_70b,anthropic_claude_3_5_sonnet' | Supported Models For the application
| VITE_AUTH0_CLIENT_ID | Mandatory if you are enabling Authentication otherwise it is optional |       |Okta Oauth Client ID for authentication
| VITE_AUTH0_DOMAIN | Mandatory if you are enabling Authentication otherwise it is optional |           | Okta Oauth Cliend Domain
| VITE_SKIP_AUTH | Optional | true | Flag to skip the authentication 
| VITE_CHUNK_OVERLAP | Optional |   20  | variable to configure chunk overlap
| VITE_TOKENS_PER_CHUNK | Optional |  100  | variable to configure tokens count per chunk.This gives flexibility for users who may require different chunk sizes for various tokenization tasks, especially when working with large datasets or specific language models.
| VITE_CHUNK_TO_COMBINE | Optional |   1  | variable to configure number of chunks to combine for parllel processing. 

## LLMs Supported 
1. OpenAI
2. Gemini
3. Diffbot
4. Azure OpenAI(dev deployed version)
5. Anthropic(dev deployed version)
6. Fireworks(dev deployed version)
7. Groq(dev deployed version)
8. Amazon Bedrock(dev deployed version)
9. Ollama(dev deployed version)
10. Deepseek(dev deployed version)
11. Other OpenAI Compatible baseurl models(dev deployed version)

## For local llms (Ollama)
1. Pull the docker imgage of ollama
```bash
docker pull ollama/ollama
```
2. Run the ollama docker image
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
3. Pull specific ollama model.
```bash
ollama pull llama3
```
4. Execute any llm model ex🦙3
```bash
docker exec -it ollama ollama run llama3
```
5. Configure  env variable in docker compose.
```env
LLM_MODEL_CONFIG_ollama_<model_name>
#example
LLM_MODEL_CONFIG_ollama_llama3=${LLM_MODEL_CONFIG_ollama_llama3-llama3,
http://host.docker.internal:11434}
```
6. Configure the backend API url
```env
VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL-backendurl}
```
7. Open the application in browser and select the ollama model for the extraction.
8. Enjoy Graph Building.


## Usage
1. Connect to Neo4j Aura Instance which can be both AURA DS or AURA DB by passing URI and password through Backend env, fill using login dialog or drag and drop the Neo4j credentials file.
2. To differntiate we have added different icons. For AURA DB we have a database icon and for AURA DS we have scientific molecule icon right under Neo4j Connection details label.
3. Choose your source from a list of Unstructured sources to create graph.
4. Change the LLM (if required) from drop down, which will be used to generate graph.
5. Optionally, define schema(nodes and relationship labels) in entity graph extraction settings.
6. Either select multiple files to 'Generate Graph' or all the files in 'New' status will be processed for graph creation.
7. Have a look at the graph for individual files using 'View' in grid or select one or more files and 'Preview Graph'
8. Ask questions related to the processed/completed sources to chat-bot, Also get detailed information about your answers generated by LLM.

## Links

[LLM Knowledge Graph Builder Application](https://llm-graph-builder.neo4jlabs.com/)

[Neo4j Workspace](https://workspace-preview.neo4j.io/workspace/query)

## Reference

[Demo of application](https://www.youtube.com/watch?v=LlNy5VmV290)

## Contact
For any inquiries or support, feel free to raise [Github Issue](https://github.com/neo4j-labs/llm-graph-builder/issues)


## Happy Graph Building!
