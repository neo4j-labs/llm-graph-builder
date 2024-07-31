import time
from neo4j import GraphDatabase

# Database configurations
neo4j_configurations = [
    {
        'name': 'Neo4j Config 1',
        'NEO4J_URI': 'neo4j+s://73b760b4.databases.neo4j.io',
        'NEO4J_USERNAME': 'neo4j',
        'NEO4J_PASSWORD': 'HqwAzfG83XwcEQ-mvEG4yNpcRTHMpsgZaYW3qIGJh2I'
    },
    # {
    #     'name': 'Neo4j Config 2',
    #     'uri': 'bolt://another-host:7687',
    #     'user': 'neo4j',
    #     'password': 'password2'
    # }
]

# Function to create a Neo4j driver
def create_driver(uri, user, password):
    return GraphDatabase.driver(uri, auth=(user, password))

# Function to clear the database
def clear_database(driver):
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

# Performance test function
def performance_test(driver, query, num_operations):
    with driver.session() as session:
        start_time = time.time()
        for i in range(num_operations):
            session.run(query, parameters={"id": i, "name": f"name_{i}"})
        end_time = time.time()
    return end_time - start_time

# Query to execute
query = "CREATE (n:Person {id: $id, name: $name})"

# Number of operations to perform
num_operations = 1000

def dbtest_main():
    results = []

    for config in neo4j_configurations:
        print(f"Testing {config['name']}...")
        
        # Create driver
        driver = create_driver(config['uri'], config['user'], config['password'])
        
        # Clear database before test
        clear_database(driver)
        
        # Run performance test
        elapsed_time = performance_test(driver, query, num_operations)
        
        # Store result
        results.append((config['name'], elapsed_time))
        
        # Close driver
        driver.close()
        
        print(f"{config['name']} completed in {elapsed_time:.4f} seconds")

    print("\nPerformance Test Results:")
    for name, time_taken in results:
        print(f"{name}: {time_taken:.4f} seconds")

if __name__ == "__main__":
    dbtest_main()