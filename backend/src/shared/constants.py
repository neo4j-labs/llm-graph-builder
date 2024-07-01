MODEL_VERSIONS = {
        "gpt-3.5": "gpt-3.5-turbo-16k",
        "gemini-1.0-pro": "gemini-1.0-pro-001",
        "gemini-1.5-pro": "gemini-1.5-pro-preview-0514",
        "gpt-4": "gpt-4-0125-preview",
        "diffbot" : "gpt-4o",
        "gpt-4o":"gpt-4o",
        "groq-llama3" : "llama3-70b-8192"
         }
OPENAI_MODELS = ["gpt-3.5", "gpt-4o"]
GEMINI_MODELS = ["gemini-1.0-pro", "gemini-1.5-pro"]
GROQ_MODELS = ["groq-llama3"]
BUCKET_UPLOAD = 'llm-graph-builder-upload'
PROJECT_ID = 'llm-experiments-387609' 


## CHAT SETUP
CHAT_MAX_TOKENS = 1000
CHAT_SEARCH_KWARG_K = 5
CHAT_SEARCH_KWARG_SCORE_THRESHOLD = 0.7
CHAT_DOC_SPLIT_SIZE = 3000
CHAT_EMBEDDING_FILTER_SCORE_THRESHOLD = 0.15
CHAT_TOKEN_CUT_OFF = {
     "gpt-3.5": 5,
     "gemini-1.0-pro": 5,
     "gemini-1.5-pro": 10,
     "gpt-4": 10,
     "diffbot" : 10,
     "gpt-4o": 10,
     "groq-llama3" : 5
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

VECTOR_GRAPH_SEARCH_QUERY="""
WITH node as chunk, score
MATCH (chunk)-[:PART_OF]->(d:Document)
CALL { WITH chunk
MATCH (chunk)-[:HAS_ENTITY]->(e)
MATCH path=(e)(()-[rels:!HAS_ENTITY&!PART_OF]-()){0,2}(:!Chunk&!Document)
UNWIND rels as r
RETURN collect(distinct r) as rels
}
WITH d, collect(DISTINCT {chunk: chunk, score: score}) AS chunks, avg(score) as avg_score, apoc.coll.toSet(apoc.coll.flatten(collect(rels))) as rels
WITH d, avg_score,
     [c IN chunks | c.chunk.text] AS texts, 
     [c IN chunks | {id: c.chunk.id, score: c.score}] AS chunkdetails,  
	[r in rels | coalesce(apoc.coll.removeAll(labels(startNode(r)),['__Entity__'])[0],"") +":"+ startNode(r).id + " "+ type(r) + " " + coalesce(apoc.coll.removeAll(labels(endNode(r)),['__Entity__'])[0],"") +":" + endNode(r).id] as entities
WITH d, avg_score,chunkdetails,
apoc.text.join(texts,"\n----\n") +
apoc.text.join(entities,"\n")
as text
RETURN text, avg_score AS score, {source: COALESCE( CASE WHEN d.url CONTAINS "None" THEN d.fileName ELSE d.url END, d.fileName), chunkdetails: chunkdetails} AS metadata
""" 





