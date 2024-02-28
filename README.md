
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

## Links
 The Public [ Google cloud Run URL](Neo4j graph builder (frontend-dcavk67s4a-uc.a.run.app)).
 [Workspace URL](https://workspace-preview.neo4j.io/workspace)
