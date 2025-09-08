#!/bin/bash

# Variables - Replace with your actual values


# uncomment htis for 'dev' (labs llm-graphbuilder)
# AWS_REGION="us-east-1"
# AWS_ENV="dev"
# AWS_ACCOUNT_ID="288761770129" # 288 is graphbuilder-dev

# uncomment this for 'metrix-demo-dev' (metrix-demo-dev)
AWS_REGION="us-east-2"
AWS_ENV="metrix-demo-dev"
AWS_ACCOUNT_ID="860839672899"

ECR_REPOSITORY="graphbuilder-docker-repo-$AWS_ENV"
ENV_FILE="./${AWS_ENV}.env"
echo "Using ENV_FILE $ENV_FILE"
TAG="latest"  # You can change this if you need a specific tag

folder_name=$(basename "$PWD")

echo "Using AWS_PROFILE $AWS_PROFILE"
echo "Using AWS_ENV $AWS_ENV"
echo "Using ECR_REPOSITORY $ECR_REPOSITORY"

# 1. Load environment variables from .env file
echo "Loading environment variables from $ENV_FILE..."
set -a  # automatically export all variables
source $ENV_FILE
set +a  # turn off automatic export

# 2. Build Docker images using Docker Compose
echo "Building Docker images..."
docker-compose build --no-cache --progress=plain
# docker-compose build

# 2. Authenticate Docker to AWS ECR
echo "Authenticating to AWS ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 3. Tag Docker images for ECR
echo "Tagging Docker images..."
for service in $(docker-compose config --services); do
    # Get the image name (service name) from Docker Compose
    IMAGE_NAME="${folder_name}_${service}:${TAG}"
    ECR_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY/$service:$TAG"
    
    echo "Tagging image $IMAGE_NAME as $ECR_IMAGE..."
    docker tag $IMAGE_NAME $ECR_IMAGE
done

echo "Docker images build successfully!"

# 4. Push Docker images to AWS ECR
echo "Pushing Docker images to ECR..."
for service in $(docker-compose config --services); do
    ECR_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY/$service:$TAG"
    
    echo "Pushing $ECR_IMAGE..."
    docker push $ECR_IMAGE
done

echo "Docker images pushed to ECR successfully!"