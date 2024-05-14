# Step 1: Build the React application
FROM node:20 AS build
ENV BACKEND_API_URL "https://staging-backend-dcavk67s4a-uc.a.run.app"
#ENV BLOOM_URL "https://bloom-latest.s3.eu-west-2.amazonaws.com/assets/index.html?connectURL={CONNECT_URL}&search=Show+me+a+graph"
ENV BLOOM_URL "https://bloom-latest.s3.eu-west-2.amazonaws.com/assets/index.html?connectURL={CONNECT_URL}&search=Show+me+a+graph&featureGenAISuggestions=true&featureGenAISuggestionsInternal=true"
ENV REACT_APP_SOURCES ""
ENV LLM_MODELS ""
ENV TIME_PER_CHUNK 4
ENV ENV "DEV"
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn add @neo4j-nvl/base @neo4j-nvl/react
RUN yarn install
COPY . ./
RUN yarn run build

# Step 2: Serve the application using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
