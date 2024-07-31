.DEFAULT_GOAL := help

SHELL=/bin/bash
VENV = venv

# Detect the operating system and set the virtualenv bin directory
ifeq ($(OS),Windows_NT)
	VENV_BIN=$(VENV)/Scripts
else
	VENV_BIN=$(VENV)/bin
endif

setup: $(VENV)/bin/activate

$(VENV)/bin/activate: $(VENV)/.venv-timestamp

$(VENV)/.venv-timestamp: requirements.txt
	python3 -m venv $(VENV)
	$(VENV_BIN)/pip install --upgrade pip
	$(VENV_BIN)/pip install -r requirements.txt
	touch $(VENV)/.venv-timestamp


.PHONY: fmt-check
fmt-check: setup ## Check Python code formatting and style without making changes
	$(VENV_BIN)/isort --check-only src *.py
	$(VENV_BIN)/black --check src *.py
	$(VENV_BIN)/blackdoc --check src *.py


.PHONY: fmt
fmt: setup ## Format Python code
	$(VENV_BIN)/isort src *.py
	$(VENV_BIN)/black src *.py
	$(VENV_BIN)/blackdoc src *.py


.PHONY: pre-commit
pre-commit: fmt-check


.PHONY: help
help:  ## Display this help screen
	@echo "Available commands:"
	@grep -E '^[a-z.A-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' | sort
