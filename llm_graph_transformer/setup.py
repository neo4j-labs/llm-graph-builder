from setuptools import find_packages, setup

setup(
    name='llm_graph_transformer',
    packages=find_packages(),
    install_packages=['langchain_community','langchain','python-dotenv','tqdm','langchain_openai','neo4j','wheel'],
    version='0.0.1',
    description='Knowledge graph creation using OpenAI GPT',
    author='Neo4j',
)

