# Step 1: Build the React application
FROM quay.io/centos/centos:stream9-minimal

ARG VITE_BACKEND_API_URL="http://localhost:8000"
ARG VITE_REACT_APP_SOURCES=""
ARG VITE_LLM_MODELS=""
ARG VITE_GOOGLE_CLIENT_ID=""
#ARG VITE_BLOOM_URL="https://workspace-preview.neo4j.io/workspace/explore?connectURL={CONNECT_URL}&search=Show+me+a+graph&featureGenAISuggestions=true&featureGenAISuggestionsInternal=true"
ARG VITE_BLOOM_URL=""
ARG VITE_TIME_PER_PAGE=50
ARG VITE_LARGE_FILE_SIZE=5242880
ARG VITE_CHUNK_SIZE=5242880
ARG VITE_CHAT_MODES=""
ARG VITE_ENV="DEV"
ARG VITE_BATCH_SIZE=2
ARG VITE_LLM_MODELS_PROD="openai_gpt_4o,openai_gpt_4o_mini,diffbot,gemini_1.5_flash"
ARG DEPLOYMENT_ENV="prod"
ENV DEPLOYMENT_ENV=$DEPLOYMENT_ENV

WORKDIR /app
RUN microdnf install findutils tar gzip bzip2 nginx -y && microdnf clean all
ADD https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh /tmp/nvm-install.sh
RUN bash /tmp/nvm-install.sh && source /root/.bashrc && nvm install --lts && nvm use --lts && corepack use yarn && corepack enable
COPY package.json yarn.lock ./
RUN source /root/.bashrc && yarn install
COPY . ./
RUN source /root/.bashrc && ls && yarn install && \
    VITE_BACKEND_API_URL=$VITE_BACKEND_API_URL \
    VITE_REACT_APP_SOURCES=$VITE_REACT_APP_SOURCES \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_BLOOM_URL=$VITE_BLOOM_URL \
    VITE_CHUNK_SIZE=$VITE_CHUNK_SIZE \
    VITE_TIME_PER_PAGE=$VITE_TIME_PER_PAGE \
    VITE_ENV=$VITE_ENV \
    VITE_LARGE_FILE_SIZE=${VITE_LARGE_FILE_SIZE} \
    VITE_CHAT_MODES=$VITE_CHAT_MODES \
    VITE_BATCH_SIZE=$VITE_BATCH_SIZE \
    VITE_LLM_MODELS=$VITE_LLM_MODELS \
    VITE_LLM_MODELS_PROD=$VITE_LLM_MODELS_PROD \
    yarn run build

COPY . ./
RUN rm -rf /usr/share/nginx/html && ln -s /app/dist /usr/share/nginx/html
COPY /nginx/nginx.${DEPLOYMENT_ENV}.conf /etc/nginx/conf.d/nginx.${DEPLOYMENT_ENV}.conf
ADD entrypoint.sh /bin/

EXPOSE 8080
CMD ["bash", "/bin/entrypoint.sh"]
