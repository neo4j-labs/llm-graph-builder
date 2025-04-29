# Default target
.PHONY: setup run clean
# Setup your local environment
setup:
	bash scripts/bootstrap.sh
# Run the application
run:
	. .venv/bin/activate && uvicorn score:app --host 0.0.0.0 --port 8000 --reload
# Clean virtual environment (optional)
clean:
	rm -rf .venv
docker-build:
	docker build -t llm_graph_builder_bakend .
	