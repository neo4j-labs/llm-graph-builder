from llm import llm
from graph import graph

# tag::import_movie_chat[]
from langchain_core.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
# end::import_movie_chat[]

# tag::import_tool[]
from langchain.tools import Tool
# end::import_tool[]

# tag::import_memory[]
from langchain_community.chat_message_histories import Neo4jChatMessageHistory
# end::import_memory[]

# tag::import_agent[]
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain import hub
# end::import_agent[]

# tag::import_get_session_id[]
from utils import get_session_id
# end::import_get_session_id[]

# tag::movie_chat[]
chat_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a movie expert providing information about movies."),
        ("human", "{input}"),
    ]
)

movie_chat = chat_prompt | llm | StrOutputParser()
# end::movie_chat[]

# tag::tools[]
tools = [
    Tool.from_function(
        name="General Chat",
        description="For general movie chat not covered by other tools",
        func=movie_chat.invoke,
    )
]
# end::tools[]

# tag::get_memory[]
def get_memory(session_id):
    return Neo4jChatMessageHistory(session_id=session_id, graph=graph)
# end::get_memory[]

# tag::agent[]
# tag::agent_prompt[]
agent_prompt = hub.pull("hwchase17/react-chat")
# end::agent_prompt[]
agent = create_react_agent(llm, tools, agent_prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True
    )

chat_agent = RunnableWithMessageHistory(
    agent_executor,
    get_memory,
    input_messages_key="input",
    history_messages_key="chat_history",
)
# end::agent[]

# tag::generate_response[]
def generate_response(user_input):
    """
    Create a handler that calls the Conversational agent
    and returns a response to be rendered in the UI
    """

    response = chat_agent.invoke(
        {"input": user_input},
        {"configurable": {"session_id": get_session_id()}},)

    return response['output']
# end::generate_response[]
