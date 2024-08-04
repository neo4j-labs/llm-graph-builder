import streamlit as st
from llm import llm
from graph import graph

# tag::import[]
from langchain_community.chains.graph_qa.cypher import GraphCypherQAChain
# end::import[]

# tag::cypher-qa[]
cypher_qa = GraphCypherQAChain.from_llm(
    llm,
    graph=graph,
    verbose=True
)
# end::cypher-qa[]
