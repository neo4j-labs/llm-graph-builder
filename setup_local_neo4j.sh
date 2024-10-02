#!/bin/bash 
docker-compose -f ./devcontainer/docker-compose-vscode.yml down
docker-compose -f ./docker-compose.local.yml down
docker-compose -f ./docker-compose.yml down

 find . -type d -name "__pycache__" -exec rm -rf {} +
 source ./backend/clean_backend_container.sh    
 
# Check if logs directory exists before deleting
if [ -d "./neo4j-persistence/logs" ]; then
    rm -rf ./neo4j-persistence/logs
fi

# Check if data directory exists before deleting
if [ -d "./neo4j-persistence/data" ]; then
    rm -rf ./neo4j-persistence/data
fi



# Check if plugins directory exists before deleting
# if [ -d "neo4j-persistence/plugins" ]; then
#     rm -rf neo4j-persistence/plugins
# fi

mkdir -p ./neo4j-persistence/logs
mkdir -p ./neo4j-persistence/data
# mkdir -p ./neo4j-persistence/plugins

#!/bin/bash

# Stop and remove all devcontainers
docker rm -f $(docker ps -aq --filter "label=vscode")

# Remove all images associated with devcontainers
docker rmi $(docker images -q --filter "label=vscode")

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Optional: Full system prune to clean everything up
docker system prune -a -f --volumes

echo "All old devcontainer runs have been cleaned up!"



echo "Persistence directories reseted"

