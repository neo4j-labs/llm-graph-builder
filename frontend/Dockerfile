# Step 1: Build the React application
FROM node:20 AS build

ARG VITE_BACKEND_API_URL="http://localhost:8000"
ARG VITE_REACT_APP_SOURCES=""
ARG VITE_LLM_MODELS=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_BLOOM_URL="https://workspace-preview.neo4j.io/workspace/explore?connectURL={CONNECT_URL}&search=Show+me+a+graph&featureGenAISuggestions=true&featureGenAISuggestionsInternal=true"
ARG VITE_TIME_PER_PAGE=50
ARG VITE_LARGE_FILE_SIZE=5242880
ARG VITE_CHUNK_SIZE=5242880
ARG VITE_CHAT_MODES=""
ARG VITE_ENV="DEV"
ARG VITE_BATCH_SIZE=2

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN VITE_BACKEND_API_URL=$VITE_BACKEND_API_URL \
    VITE_REACT_APP_SOURCES=$VITE_REACT_APP_SOURCES \
    VITE_LLM_MODELS=$VITE_LLM_MODELS \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_BLOOM_URL=$VITE_BLOOM_URL \
    VITE_CHUNK_SIZE=$VITE_CHUNK_SIZE \
    VITE_TIME_PER_PAGE=$VITE_TIME_PER_PAGE \
    VITE_ENV=$VITE_ENV \
    VITE_LARGE_FILE_SIZE=${VITE_LARGE_FILE_SIZE} \
    VITE_CHAT_MODES=$VITE_CHAT_MODES \
    VITE_BATCH_SIZE=$VITE_BATCH_SIZE \
    yarn run build

# Step 2: Serve the application using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
