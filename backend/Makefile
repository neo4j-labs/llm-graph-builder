# Makefile for PostgreSQL monitoring database operations

.PHONY: help install migrate rollback reset seed clean test

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install Python dependencies"
	@echo "  migrate     - Run database migrations"
	@echo "  rollback    - Rollback last migration"
	@echo "  reset       - Reset database (drop all tables and recreate)"
	@echo "  seed        - Seed database with sample data"
	@echo "  clean       - Clean up temporary files"
	@echo "  test        - Test database connection"
	@echo "  status      - Show migration status"

# Install dependencies
install:
	pip3 install -r requirements.txt

# Initialize Alembic (first time only)
init-alembic:
	alembic init migrations

# Run all pending migrations
migrate:
	@echo "Running database migrations..."
	alembic upgrade head
	@echo "Migrations completed!"

# Rollback last migration
rollback:
	@echo "Rolling back last migration..."
	alembic downgrade -1
	@echo "Rollback completed!"

# Reset database (drop all and recreate)
reset:
	@echo "Resetting database..."
	alembic downgrade base
	alembic upgrade head
	@echo "Database reset completed!"

# Show migration status
status:
	@echo "Migration status:"
	alembic current
	alembic history

# Seed database with sample data
seed:
	@echo "Seeding database with sample data..."
	python3 -c "from src.database import get_db; from src.monitoring_service_pg import MonitoringServicePG; db = get_db(); service = MonitoringServicePG(); sample_entities = [{'name': 'Bill Gates', 'type': 'Individual', 'risk_threshold': 0.7, 'category': 'Technology', 'status': 'active'}, {'name': 'Microsoft', 'type': 'Organization', 'risk_threshold': 0.6, 'category': 'Technology', 'status': 'active'}, {'name': 'OpenAI', 'type': 'Organization', 'risk_threshold': 0.8, 'category': 'AI', 'status': 'active'}]; [print(f'Added entity: {entity[\"name\"]}') if service.store_monitored_entity(entity) else print(f'Failed to add {entity[\"name\"]}') for entity in sample_entities]; print('Database seeding completed!')"

# Test database connection
test:
	@echo "Testing database connection..."
	python3 -c "from src.database import get_db; db = get_db(); result = db.execute_query('SELECT 1 as test'); print(f'Database connection successful! Test result: {result}')"

# Clean up temporary files
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.log" -delete
	@echo "Cleanup completed!"

# Create new migration
migration:
	@read -p "Enter migration name: " name; \
	alembic revision --autogenerate -m "$$name"

# Show database tables
tables:
	@echo "Database tables:"
	python3 -c "from src.database import get_db; db = get_db(); result = db.execute_query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name\"); [print(f'  - {row[\"table_name\"]}') for row in result]"

# Show table structure
schema:
	@echo "Table schemas:"
	python3 -c "from src.database import get_db; db = get_db(); tables = ['monitored_entities', 'risk_assessments', 'alerts']; [print(f'\\n{table}:') or [print(f'  {row[\"column_name\"]:<20} {row[\"data_type\"]:<15} {\"NULL\" if row[\"is_nullable\"] == \"YES\" else \"NOT NULL\"}') for row in db.execute_query(f\"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position\")] for table in tables]"
