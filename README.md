
# Knowledge Graph Builder App

This app is designed to process medical documents and contruct a knowledge graph from the insights.

### Getting started

:warning: You will need to have a Neo4j Database V5.15 or later with [APOC installed](https://neo4j.com/docs/apoc/current/installation/) to use this Knowledge Graph Builder.


### Deploy locally
#### Running through docker-compose


You can then run Docker Compose to build and start all components:
```bash
docker-compose up --build
```

##### Additional configs

By default, the input sources will be: Local files, Youtube, Wikipedia and AWS S3. As this default config is applied:
```env
REACT_APP_SOURCES="local,youtube,wiki,s3"
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

