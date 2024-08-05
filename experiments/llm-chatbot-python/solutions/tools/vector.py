import streamlit as st
from llm import llm, embeddings
from graph import graph

# tag::import_vector[]
from langchain_community.vectorstores.neo4j_vector import Neo4jVector
# end::import_vector[]
# tag::import_chain[]
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
# end::import_chain[]

# tag::import_chat_prompt[]
from langchain_core.prompts import ChatPromptTemplate
# end::import_chat_prompt[]


# tag::vector[]
neo4jvector = Neo4jVector.from_existing_index(
    embeddings,                              # <1>
    graph=graph,                             # <2>
    index_name="moviePlots",                 # <3>
    node_label="Movie",                      # <4>
    text_node_property="plot",               # <5>
    embedding_node_property="plotEmbedding", # <6>
    retrieval_query="""
RETURN
    node.plot AS text,
    score,
    {
        title: node.title,
        directors: [ (person)-[:DIRECTED]->(node) | person.name ],
        actors: [ (person)-[r:ACTED_IN]->(node) | [person.name, r.role] ],
        tmdbId: node.tmdbId,
        source: 'https://www.themoviedb.org/movie/'+ node.tmdbId
    } AS metadata
"""
)
# end::vector[]

# tag::retriever[]
retriever = neo4jvector.as_retriever()
# end::retriever[]

# tag::prompt[]
instructions = (
    "Use the given context to answer the question."
    "If you don't know the answer, say you don't know."
    "Context: {context}"
)

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", instructions),
        ("human", "{input}"),
    ]
)
# end::prompt[]

# tag::chain[]
question_answer_chain = create_stuff_documents_chain(llm, prompt)
plot_retriever = create_retrieval_chain(
    retriever, 
    question_answer_chain
)
# end::chain[]

# tag::get_movie_plot[]
def get_movie_plot(input):
    return plot_retriever.invoke({"input": input})
# end::get_movie_plot[]
