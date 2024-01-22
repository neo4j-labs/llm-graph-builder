# llm-graph-builder

# Project Overview
Welcome to our project! This project is built using FastAPI framework to create a fast and modern API with Python.

# Feature
API Endpoint : This project provides various API endpoint to perform specific tasks.
Data Valication : Utilize FastAPI data validation and serialization feature.
Interactiev Documentation : Access Swagger UI and ReDoc for interactive API documentation.

# Getting Started 

Follow these steps to set up and run the project locally:

1. Clone the Repository:

git clone https://github.com/neo4j-labs/llm-graph-builder.git
cd llm-graph-builder

2. Install Dependency :

pip install -t requirement.txt

3. Run the server:
uvicorn score:app --reload

4. Acces the API Documentation
Open your browser and navidate to
http://127.0.0.1:8000/docs for Swagger UI or
http://127.0.0.1:8000/redocs for ReDoc.

# Project Structure
`score.py` : Score entry point for FastAPI application
`app/` : Directory containing additional module routers, ot utilities

# Contact
For questions or support, feel free to contact us at christopher.crosbie@neo4j.com or michael.hunger@neo4j.com