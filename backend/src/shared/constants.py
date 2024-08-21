MODEL_VERSIONS = {
        "openai-gpt-3.5": "gpt-3.5-turbo-16k",
        "gemini-1.0-pro": "gemini-1.0-pro-001",
        "gemini-1.5-pro": "gemini-1.5-pro-preview-0514",
        "openai-gpt-4": "gpt-4-0125-preview",
        "diffbot" : "gpt-4o",
        "openai-gpt-4o-mini": "gpt-4o-mini",
        "openai-gpt-4o":"gpt-4o",
        "groq-llama3" : "llama3-70b-8192"
         }
OPENAI_MODELS = ["openai-gpt-3.5", "openai-gpt-4o", "openai-gpt-4o-mini"]
GEMINI_MODELS = ["gemini-1.0-pro", "gemini-1.5-pro"]
GROQ_MODELS = ["groq-llama3"]
BUCKET_UPLOAD = 'llm-graph-builder-upload'
BUCKET_FAILED_FILE = 'llm-graph-builder-failed'
PROJECT_ID = 'llm-experiments-387609' 
GRAPH_CHUNK_LIMIT = 50 

#query 
GRAPH_QUERY = """
MATCH docs = (d:Document) 
WHERE d.fileName IN $document_names
WITH docs, d ORDER BY d.createdAt DESC
// fetch chunks for documents, currently with limit
CALL {{
  WITH d
  OPTIONAL MATCH chunks=(d)<-[:PART_OF|FIRST_CHUNK]-(c:Chunk)
  RETURN c, chunks LIMIT {graph_chunk_limit}
}}

WITH collect(distinct docs) as docs, collect(distinct chunks) as chunks, collect(distinct c) as selectedChunks
WITH docs, chunks, selectedChunks
// select relationships between selected chunks
WITH *, 
[ c in selectedChunks | [p=(c)-[:NEXT_CHUNK|SIMILAR]-(other) WHERE other IN selectedChunks | p]] as chunkRels

// fetch entities and relationships between entities
CALL {{
  WITH selectedChunks
  UNWIND selectedChunks as c
  
  OPTIONAL MATCH entities=(c:Chunk)-[:HAS_ENTITY]->(e)
  OPTIONAL MATCH entityRels=(e)--(e2:!Chunk) WHERE exists {{
    (e2)<-[:HAS_ENTITY]-(other) WHERE other IN selectedChunks
  }}
  RETURN collect(entities) as entities, collect(entityRels) as entityRels
}}

WITH apoc.coll.flatten(docs + chunks + chunkRels + entities + entityRels, true) as paths

// distinct nodes and rels
CALL {{ WITH paths UNWIND paths AS path UNWIND nodes(path) as node WITH distinct node 
       RETURN collect(node /* {{.*, labels:labels(node), elementId:elementId(node), embedding:null, text:null}} */) AS nodes }}
CALL {{ WITH paths UNWIND paths AS path UNWIND relationships(path) as rel RETURN collect(distinct rel) AS rels }}  
RETURN nodes, rels

"""

## CHAT SETUP
CHAT_MAX_TOKENS = 1000
CHAT_SEARCH_KWARG_K = 3
CHAT_SEARCH_KWARG_SCORE_THRESHOLD = 0.5
CHAT_DOC_SPLIT_SIZE = 3000
CHAT_EMBEDDING_FILTER_SCORE_THRESHOLD = 0.10
CHAT_TOKEN_CUT_OFF = {
     ("openai-gpt-3.5",'azure_ai_gpt_35',"gemini-1.0-pro","gemini-1.5-pro","groq-llama3",'groq_llama3_70b','anthropic_claude_3_5_sonnet','fireworks_llama_v3_70b','bedrock_claude_3_5_sonnet', ) : 4, 
     ("openai-gpt-4","diffbot" ,'azure_ai_gpt_4o',"openai-gpt-4o", "openai-gpt-4o-mini") : 28,
     ("ollama_llama3") : 2  
} 


### CHAT TEMPLATES 
CHAT_SYSTEM_TEMPLATE = """
You are an AI-powered question-answering agent. Your task is to provide accurate and comprehensive responses to user queries based on the given context, chat history, and available resources.

### Response Guidelines:
1. **Direct Answers**: Provide clear and thorough answers to the user's queries without headers unless requested. Avoid speculative responses.
2. **Utilize History and Context**: Leverage relevant information from previous interactions, the current user input, and the context provided below.
3. **No Greetings in Follow-ups**: Start with a greeting in initial interactions. Avoid greetings in subsequent responses unless there's a significant break or the chat restarts.
4. **Admit Unknowns**: Clearly state if an answer is unknown. Avoid making unsupported statements.
5. **Avoid Hallucination**: Only provide information based on the context provided. Do not invent information.
6. **Response Length**: Keep responses concise and relevant. Aim for clarity and completeness within 4-5 sentences unless more detail is requested.
7. **Tone and Style**: Maintain a professional and informative tone. Be friendly and approachable.
8. **Error Handling**: If a query is ambiguous or unclear, ask for clarification rather than providing a potentially incorrect answer.
9. **Fallback Options**: If the required information is not available in the provided context, provide a polite and helpful response. Example: "I don't have that information right now." or "I'm sorry, but I don't have that information. Is there something else I can help with?"
10. **Context Availability**: If the context is empty, do not provide answers based solely on internal knowledge. Instead, respond appropriately by indicating the lack of information.


**IMPORTANT** : DO NOT ANSWER FROM YOUR KNOWLEDGE BASE USE THE BELOW CONTEXT

### Context:
<context>
{context}
</context>

### Example Responses:
User: Hi 
AI Response: 'Hello there! How can I assist you today?'

User: "What is Langchain?"
AI Response: "Langchain is a framework that enables the development of applications powered by large language models, such as chatbots. It simplifies the integration of language models into various applications by providing useful tools and components."

User: "Can you explain how to use memory management in Langchain?"
AI Response: "Langchain's memory management involves utilizing built-in mechanisms to manage conversational context effectively. It ensures that the conversation remains coherent and relevant by maintaining the history of interactions and using it to inform responses."

User: "I need help with PyCaret's classification model."
AI Response: "PyCaret simplifies the process of building and deploying machine learning models. For classification tasks, you can use PyCaret's setup function to prepare your data. After setup, you can compare multiple models to find the best one, and then fine-tune it for better performance."

User: "What can you tell me about the latest realtime trends in AI?"
AI Response: "I don't have that information right now. Is there something else I can help with?"

Note: This system does not generate answers based solely on internal knowledge. It answers from the information provided in the user's current and previous inputs, and from the context.
"""


QUESTION_TRANSFORM_TEMPLATE = "Given the below conversation, generate a search query to look up in order to get information relevant to the conversation. Only respond with the query, nothing else." 


## CHAT QUERIES 
VECTOR_SEARCH_QUERY = """
WITH node AS chunk, score
MATCH (chunk)-[:PART_OF]->(d:Document)
WITH d, collect(distinct {chunk: chunk, score: score}) as chunks, avg(score) as avg_score
WITH d, avg_score, 
     [c in chunks | c.chunk.text] as texts, 
     [c in chunks | {id: c.chunk.id, score: c.score}] as chunkdetails
WITH d, avg_score, chunkdetails,
     apoc.text.join(texts, "\n----\n") as text
RETURN text, avg_score AS score, 
       {source: COALESCE(CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), chunkdetails: chunkdetails} as metadata
""" 

# VECTOR_GRAPH_SEARCH_QUERY="""
# WITH node as chunk, score
# MATCH (chunk)-[:__PART_OF__]->(d:__Document__)
# CALL { WITH chunk
# MATCH (chunk)-[:__HAS_ENTITY__]->(e)
# MATCH path=(e)(()-[rels:!__HAS_ENTITY__&!__PART_OF__]-()){0,2}(:!__Chunk__&!__Document__)
# UNWIND rels as r
# RETURN collect(distinct r) as rels
# }
# WITH d, collect(DISTINCT {chunk: chunk, score: score}) AS chunks, avg(score) as avg_score, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels
# WITH d, avg_score,
#      [c IN chunks | c.chunk.text] AS texts, 
#      [c IN chunks | {id: c.chunk.id, score: c.score}] AS chunkdetails,  
# 	[r in rels | coalesce(apoc.coll.removeAll(labels(startNode(r)),['__Entity__'])[0],"") +":"+ startNode(r).id + " "+ type(r) + " " + coalesce(apoc.coll.removeAll(labels(endNode(r)),['__Entity__'])[0],"") +":" + endNode(r).id] as entities
# WITH d, avg_score,chunkdetails,
# apoc.text.join(texts,"\n----\n") +
# apoc.text.join(entities,"\n")
# as text
# RETURN text, avg_score AS score, {source: COALESCE( CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), chunkdetails: chunkdetails} AS metadata
# """  


# VECTOR_GRAPH_SEARCH_QUERY = """
# WITH node as chunk, score
# // find the document of the chunk
# MATCH (chunk)-[:__PART_OF__]->(d:__Document__)
# // fetch entities
# CALL { WITH chunk
# // entities connected to the chunk
# // todo only return entities that are actually in the chunk, remember we connect all extracted entities to all chunks
# MATCH (chunk)-[:__HAS_ENTITY__]->(e)

# // depending on match to query embedding either 1 or 2 step expansion
# WITH CASE WHEN true // vector.similarity.cosine($embedding, e.embedding ) <= 0.95
# THEN 
# collect { MATCH path=(e)(()-[rels:!__HAS_ENTITY__&!__PART_OF__]-()){0,1}(:!Chunk&!__Document__) RETURN path }
# ELSE 
# collect { MATCH path=(e)(()-[rels:!__HAS_ENTITY__&!__PART_OF__]-()){0,2}(:!Chunk&!__Document__) RETURN path } 
# END as paths

# RETURN collect{ unwind paths as p unwind relationships(p) as r return distinct r} as rels,
# collect{ unwind paths as p unwind nodes(p) as n return distinct n} as nodes
# }
# // aggregate chunk-details and de-duplicate nodes and relationships
# WITH d, collect(DISTINCT {chunk: chunk, score: score}) AS chunks, avg(score) as avg_score, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels,

# // TODO sort by relevancy (embeddding comparision?) cut off after X (e.g. 25) nodes?
# apoc.coll.toSet(apoc.coll.flatten(collect(
#                 [r in rels |[startNode(r),endNode(r)]]),true)) as nodes

# // generate metadata and text components for chunks, nodes and relationships
# WITH d, avg_score,
#      [c IN chunks | c.chunk.text] AS texts, 
#      [c IN chunks | {id: c.chunk.id, score: c.score}] AS chunkdetails,  
#   apoc.coll.sort([n in nodes | 

# coalesce(apoc.coll.removeAll(labels(n),['__Entity__'])[0],"") +":"+ 
# n.id + (case when n.description is not null then " ("+ n.description+")" else "" end)]) as nodeTexts,
# 	apoc.coll.sort([r in rels 
#     // optional filter if we limit the node-set
#     // WHERE startNode(r) in nodes AND endNode(r) in nodes 
#   | 
# coalesce(apoc.coll.removeAll(labels(startNode(r)),['__Entity__'])[0],"") +":"+ 
# startNode(r).id +
# " " + type(r) + " " + 
# coalesce(apoc.coll.removeAll(labels(endNode(r)),['__Entity__'])[0],"") +":" + 
# endNode(r).id
# ]) as relTexts

# // combine texts into response-text
# WITH d, avg_score,chunkdetails,
# "Text Content:\n" +
# apoc.text.join(texts,"\n----\n") +
# "\n----\nEntities:\n"+
# apoc.text.join(nodeTexts,"\n") +
# "\n----\nRelationships:\n"+
# apoc.text.join(relTexts,"\n")

# as text
# RETURN text, avg_score as score, {length:size(text), source: COALESCE( CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), chunkdetails: chunkdetails} AS metadata
# """

VECTOR_GRAPH_SEARCH_ENTITY_LIMIT = 25

VECTOR_GRAPH_SEARCH_QUERY = """
WITH node as chunk, score
// find the document of the chunk
MATCH (chunk)-[:PART_OF]->(d:Document)

// aggregate chunk-details
WITH d, collect(DISTINCT {{chunk: chunk, score: score}}) AS chunks, avg(score) as avg_score
// fetch entities
CALL {{ WITH chunks
UNWIND chunks as chunkScore
WITH chunkScore.chunk as chunk
// entities connected to the chunk
// todo only return entities that are actually in the chunk, remember we connect all extracted entities to all chunks
// todo sort by relevancy (embeddding comparision?) cut off after X (e.g. 25) nodes?
OPTIONAL MATCH (chunk)-[:HAS_ENTITY]->(e)
WITH e, count(*) as numChunks 
ORDER BY numChunks DESC LIMIT {no_of_entites}
// depending on match to query embedding either 1 or 2 step expansion
WITH CASE WHEN true // vector.similarity.cosine($embedding, e.embedding ) <= 0.95
THEN 
collect {{ OPTIONAL MATCH path=(e)(()-[rels:!HAS_ENTITY&!PART_OF]-()){{0,1}}(:!Chunk&!Document) RETURN path }}
ELSE 
collect {{ OPTIONAL MATCH path=(e)(()-[rels:!HAS_ENTITY&!PART_OF]-()){{0,2}}(:!Chunk&!Document) RETURN path }} 
END as paths, e
WITH apoc.coll.toSet(apoc.coll.flatten(collect(distinct paths))) as paths, collect(distinct e) as entities
// de-duplicate nodes and relationships across chunks
RETURN collect{{ unwind paths as p unwind relationships(p) as r return distinct r}} as rels,
collect{{ unwind paths as p unwind nodes(p) as n return distinct n}} as nodes, entities
}}

// generate metadata and text components for chunks, nodes and relationships
WITH d, avg_score,
     [c IN chunks | c.chunk.text] AS texts, 
     [c IN chunks | {{id: c.chunk.id, score: c.score}}] AS chunkdetails, 
  apoc.coll.sort([n in nodes | 

coalesce(apoc.coll.removeAll(labels(n),['__Entity__'])[0],"") +":"+ 
n.id + (case when n.description is not null then " ("+ n.description+")" else "" end)]) as nodeTexts,
	apoc.coll.sort([r in rels 
    // optional filter if we limit the node-set
    // WHERE startNode(r) in nodes AND endNode(r) in nodes 
  | 
coalesce(apoc.coll.removeAll(labels(startNode(r)),['__Entity__'])[0],"") +":"+ 
startNode(r).id +
" " + type(r) + " " + 
coalesce(apoc.coll.removeAll(labels(endNode(r)),['__Entity__'])[0],"") +":" + endNode(r).id
]) as relTexts
, entities
// combine texts into response-text

WITH d, avg_score,chunkdetails,
"Text Content:\\n" +
apoc.text.join(texts,"\\n----\\n") +
"\\n----\\nEntities:\\n"+
apoc.text.join(nodeTexts,"\\n") +
"\\n----\\nRelationships:\\n" +
apoc.text.join(relTexts,"\\n")

as text,entities

RETURN text, avg_score as score, {{length:size(text), source: COALESCE( CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), chunkdetails: chunkdetails}} AS metadata
"""
YOUTUBE_CHUNK_SIZE_SECONDS = 60
