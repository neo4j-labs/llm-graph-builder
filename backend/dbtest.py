import os
import time
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv()

# Lấy các biến môi trường
NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

# Hàm tạo driver
def create_driver():
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        raise ValueError("Thiếu một hoặc nhiều biến môi trường cần thiết: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    return driver

# Ví dụ sử dụng driver
def clear_database(driver):
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

def performance_test(driver, query, num_operations):
    with driver.session() as session:
        start_time = time.time()
        for i in range(num_operations):
            session.run(query, parameters={"id": i, "name": f"name_{i}"})
        end_time = time.time()
    return end_time - start_time

def dbtest_main():
    try:
        driver = create_driver()
    except ValueError as ve:
        print(f"Lỗi cấu hình: {ve}")
        return

    try:
        print("Testing Neo4j Config...")
        clear_database(driver)
        query = "CREATE (n:Person {id: $id, name: $name})"
        elapsed_time = performance_test(driver, query, 1000)
        print(f"Performance Test Completed in {elapsed_time:.4f} seconds")
    except Exception as e:
        print(f"Đã xảy ra lỗi: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    dbtest_main()