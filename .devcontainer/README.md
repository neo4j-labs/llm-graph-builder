# VS Code Dev Container readme

Here’s how to set up and use a development container (devcontainer) in VS Code using the vscode branch.

### Prerequisites

1. Install [VS Code](https://code.visualstudio.com/) if not installed.
2. Install the [Remote - Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for VS Code.
3. Install Docker and Docker Compose if not already installed.

### Step-by-Step Instructions

1. **Open the Project in VS Code**

   - Open VS Code and navigate to your project folder where the provided files are located.
2. **Review DevContainer Configuration**

   - The main configuration file for the devcontainer is `devcontainer.json` located inside the `.devcontainer/` folder. This file outlines how the development container should be set up.
3. **Inspect the `devcontainer.json` File**:

   - The `dockerComposeFile` section references the `docker-compose-vscode.yml` file, which is responsible for setting up the services.
   - The containerized services for VS Code to interact with are listed under the `service` property, with `"backend"` specified as the primary service.
   - `"runServices"` includes the services `neo4j`, `backend`, and `frontend`, which will be started when you open the devcontainer.
   - The `postCreateCommand` and `onCreateCommand` fields reference scripts to clean up the backend container (`clean_backend_container_residual_files.sh`) and set up the backend (`setup_backend_container.sh`).
4. **Start the DevContainer in VS Code**:

   - Open the Command Palette in VS Code (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Type and select `Remote-Containers: Reopen in Container`.
   - VS Code will use the `docker-compose-vscode.yml` file to spin up the necessary containers.
5. **Setting up Neo4j and Backend Services**:

   - The `start_clean_local.sh` script will initialize a clean local setup for Neo4j and the backend.
     ```bash
     ./start_clean_local.sh
     ```

     - This will source the `setup_local_neo4j.sh` script to clean up and set up persistence directories for Neo4j, and then start the local services using `docker-compose.local.yml`.
6. **Using the Backend and Debugging**:

   - The backend service is set up with debugging capabilities via the `setup_backend_container.sh` script. It installs `debugpy` for Python debugging and runs the application using Gunicorn and Uvicorn workers:
     ```bash
     python -m debugpy --log-to /code/debugpy.log --listen 0.0.0.0:5678 -m gunicorn -w 8 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 300 score:app
     ```
7. **Port Forwarding**:

   - Ports `8000` and `5678` are forwarded as defined in `devcontainer.json`, allowing access to the backend and debug capabilities from your local machine.
8. **Cleaning Up Residual Files**:

   - The script `clean_backend_container_residual_files.sh` is used to remove environment files, logs, and cache:
     ```bash
     ./clean_backend_container_residual_files.sh
     ```

### Commands Summary

- **Start the DevContainer**: `Remote-Containers: Reopen in Container`
- **Clean and Start Local Neo4j Setup**:
  ```bash
  ./start_clean_local.sh
  ```
- **Backend and Debug Setup** (Runs automatically on container creation):
  ```bash
  ./setup_backend_container.sh
  ```
- **Run debug using VS Code**: Happy debugging! (we assume that you now how to run debug using VS Code)
  
By following these instructions, you can effectively set up and use the development environment within a containerized setup in VS Code. This will allow you to run and debug your project with integrated support for Neo4j and Python.

## Contact

For questions or support, feel free to contact us at thomas@mazi4u.com
