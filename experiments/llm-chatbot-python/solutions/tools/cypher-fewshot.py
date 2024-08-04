from langchain.chains import GraphCypherQAChain
from langchain.prompts.prompt import PromptTemplate

from solutions.llm import llm
from solutions.graph import graph


# tag::prompt[]
CYPHER_GENERATION_TEMPLATE = """
You are an expert Neo4j Developer translating user questions into Cypher to answer questions about movies and provide recommendations.
Convert the user's question based on the schema.

Use only the provided relationship types and properties in the schema.
Do not use any other relationship types or properties that are not provided.

Do not return entire nodes or embedding properties.

Fine Tuning:

For movie titles that begin with "The", move "the" to the end. For example "The 39 Steps" becomes "39 Steps, The" or "the matrix" becomes "Matrix, The".

Example Cypher Statements:

1. To find who acted in a movie:
```
MATCH (p:Person)-[r:ACTED_IN]->(m:Movie {{title: "Movie Title"}})
RETURN p.name, r.role
```

2. To find who directed a movie:
```
MATCH (p:Person)-[r:DIRECTED]->(m:Movie {{title: "Movie Title"}})
RETURN p.name
```

Schema:
{schema}

Question:
{question}
"""
# end::prompt[]

cypher_prompt = PromptTemplate.from_template(CYPHER_GENERATION_TEMPLATE)

cypher_qa = GraphCypherQAChain.from_llm(
    llm,
    graph=graph,
    verbose=True,
    cypher_prompt=cypher_prompt
)