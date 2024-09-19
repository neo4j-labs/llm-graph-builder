# Use the official Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim@sha256:adbcdfcd0511bab2d6db252e55b983da1b431598ed755c1620b291fbeb5f6f72

# Copy local code to the container image.
ENV APP_HOME /app
ENV PYTHONUNBUFFERED TRUE

WORKDIR $APP_HOME
COPY . .

# Install production dependencies.
RUN pip install functions-framework
RUN pip install -r requirements.txt

# Run the web service on container startup.
CMD exec functions-framework --target=getTranscript_title_from_youtube_URL