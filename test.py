URI = "neo4j+s://demo.neo4jlabs.com"
user = "persistent"
password = "848345f99c41b3844dc02bb4e6295f3e"
database = "persistent2"

from neo4j import GraphDatabase

AUTH = (user, password)

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    driver.verify_connectivity()