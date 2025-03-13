import logging
from langchain.docstore.document import Document
import os
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_google_vertexai import ChatVertexAI
from langchain_groq import ChatGroq
from langchain_google_vertexai import HarmBlockThreshold, HarmCategory
from langchain_experimental.graph_transformers.diffbot import DiffbotGraphTransformer
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_anthropic import ChatAnthropic
from langchain_fireworks import ChatFireworks
from langchain_aws import ChatBedrock
from langchain_community.chat_models import ChatOllama
import boto3
import google.auth

# Added by ian
from pydantic import BaseModel, Field
from enum import Enum


# Step 1: Define the Pydantic model for the function parameters
class EducationLevelInput(BaseModel):
    course: str = Field(..., description="Call this tool when the user selects an education level. Provide the education level from the enum, for example grade9.",
                        enum=["grade9", "grade10", "grade11", "grade12"])


# class LessonTopicInput(BaseModel):
#     lessonTopic: str = Field(..., description="Call this tool when the user selects an lesson topic. Provide a topic name for a lesson, e.g. History of Astronomy.")

class LessonTopicInput(BaseModel):
    lessonTopic: str = Field(
        ..., 
        description=(
            "Call this tool ONLY when the user explicitly selects a lesson topic, "
            "such as saying 'I want to select lesson topic X' or 'I choose X'. "
            "DO NOT call this tool when the user is asking for keywords or selecting keywords or subtopics."
            "DO NOT call this tool when the user is asking for topic suggestions, "
            "such as 'Can you suggest some topics?' or 'I want to teach a lesson related to X, "
            "please suggest some related lesson topics.' "
            "Provide the specific topic name the user has selected, e.g., 'History of Astronomy'."
        )
    )

# Define the enum of subjects
class SubjectEnum(str, Enum):
    Anatomy = "Anatomy"
    Astronomy = "Astronomy"
    Chemistry = "Chemistry"
    US_History = "U.S. History"
    Zoology = "Zoology"
    History_of_Science = "History of Science"
    Theater = "Theater"
    Artificial_Intelligence = "Artificial Intelligence"
    Mythology = "Mythology"
    SEL = "Social and Emotional Learning"

# Define the input model using Pydantic
class SelectSubjectInput(BaseModel):
    subject: SubjectEnum = Field(..., description="Call this when the user selects a subject in their message. Get a subject from the enum, for example Chemistry.")
# end of added by ian

class OnGenerateKeywordsInput(BaseModel):
    keywords: str = Field(
        ...,
        description=(
            "ONLY call this tool when ALL of these conditions are met:\n"
            "1. The MOST RECENT message was from the human/user (not from the assistant)\n"
            "2. The user EXPLICITLY APPROVES previously suggested keywords\n"
            "3. The user says something like 'yes, those keywords look good' or "
            "'I approve these keywords' or 'let's use these keywords'\n\n"
            "DO NOT call this tool when:\n"
            "1. You (the assistant) are suggesting initial keywords to the user\n"
            "2. The user asks for keyword suggestions\n"
            "3. The user hasn't explicitly approved the keywords\n"
            "4. The most recent message was from you (the assistant)\n\n"
            "Example valid triggers (must be the most recent message):\n"
            "- User: 'Yes, those keywords look good'\n"
            "- User: 'I approve these keywords'\n"
            "- User: 'Let's use these keywords'\n\n"
            "The keywords should be provided as a comma-separated string of 3 terms that were "
            "previously suggested and approved by the user."
        )
    )
    
    class Config:
        schema_extra = {
            "example": {
                "keywords": "education, technology, AI"
            }
        }

def get_llm(model: str, add_tools=False):
    """Retrieve the specified language model based on the model name."""

    logging.info(f"get_llm called with add_tools {add_tools}")
    model = model.lower().strip()
    env_key = f"LLM_MODEL_CONFIG_{model}"
    env_value = os.environ.get(env_key)

    if not env_value:
        err = f"Environment variable '{env_key}' is not defined as per format or missing"
        logging.error(err)
        raise Exception(err)
    
    logging.info("Model: {}".format(env_key))
    try:
        if "gemini" in model:
            model_name = env_value
            credentials, project_id = google.auth.default()
            llm = ChatVertexAI(
                model_name=model_name,
                #convert_system_message_to_human=True,
                credentials=credentials,
                project=project_id,
                temperature=0,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                },
            )
        elif "openai" in model:
            model_name, api_key = env_value.split(",")
            llm = ChatOpenAI(
                api_key=api_key,
                model=model_name,
                temperature=0,
            )
            if(add_tools==True): 
                logging.info("binding tool");
                llm = llm.bind_tools([EducationLevelInput, LessonTopicInput, SelectSubjectInput, OnGenerateKeywordsInput])
                logging.info("bound the tool")


        elif "azure" in model:
            model_name, api_endpoint, api_key, api_version = env_value.split(",")
            llm = AzureChatOpenAI(
                api_key=api_key,
                azure_endpoint=api_endpoint,
                azure_deployment=model_name,  # takes precedence over model parameter
                api_version=api_version,
                temperature=0,
                max_tokens=None,
                timeout=None,
            )

        elif "anthropic" in model:
            model_name, api_key = env_value.split(",")
            llm = ChatAnthropic(
                api_key=api_key, model=model_name, temperature=0, timeout=None
            )

        elif "fireworks" in model:
            model_name, api_key = env_value.split(",")
            llm = ChatFireworks(api_key=api_key, model=model_name)

        elif "groq" in model:
            model_name, base_url, api_key = env_value.split(",")
            llm = ChatGroq(api_key=api_key, model_name=model_name, temperature=0)

        elif "bedrock" in model:
            model_name, aws_access_key, aws_secret_key, region_name = env_value.split(",")
            bedrock_client = boto3.client(
                service_name="bedrock-runtime",
                region_name=region_name,
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
            )

            llm = ChatBedrock(
                client=bedrock_client, model_id=model_name, model_kwargs=dict(temperature=0)
            )

        elif "ollama" in model:
            model_name, base_url = env_value.split(",")
            llm = ChatOllama(base_url=base_url, model=model_name)

        elif "diffbot" in model:
            #model_name = "diffbot"
            model_name, api_key = env_value.split(",")
            llm = DiffbotGraphTransformer(
                diffbot_api_key=api_key,
                extract_types=["entities", "facts"],
            )
        
        else: 
            model_name, api_endpoint, api_key = env_value.split(",")
            llm = ChatOpenAI(
                api_key=api_key,
                base_url=api_endpoint,
                model=model_name,
                temperature=0,
            )
    except Exception as e:
        err = f"Error while creating LLM '{model}': {str(e)}"
        logging.error(err)
        raise Exception(err)
 
    logging.info(f"Model created - Model Version: {model}")
    return llm, model_name


def get_combined_chunks(chunkId_chunkDoc_list):
    chunks_to_combine = int(os.environ.get("NUMBER_OF_CHUNKS_TO_COMBINE"))
    logging.info(f"Combining {chunks_to_combine} chunks before sending request to LLM")
    combined_chunk_document_list = []
    combined_chunks_page_content = [
        "".join(
            document["chunk_doc"].page_content
            for document in chunkId_chunkDoc_list[i : i + chunks_to_combine]
        )
        for i in range(0, len(chunkId_chunkDoc_list), chunks_to_combine)
    ]
    combined_chunks_ids = [
        [
            document["chunk_id"]
            for document in chunkId_chunkDoc_list[i : i + chunks_to_combine]
        ]
        for i in range(0, len(chunkId_chunkDoc_list), chunks_to_combine)
    ]

    for i in range(len(combined_chunks_page_content)):
        combined_chunk_document_list.append(
            Document(
                page_content=combined_chunks_page_content[i],
                metadata={"combined_chunk_ids": combined_chunks_ids[i]},
            )
        )
    return combined_chunk_document_list

def get_chunk_id_as_doc_metadata(chunkId_chunkDoc_list):
    combined_chunk_document_list = [
       Document(
           page_content=document["chunk_doc"].page_content,
           metadata={"chunk_id": [document["chunk_id"]]},
       )
       for document in chunkId_chunkDoc_list
   ]
    return combined_chunk_document_list
      

async def get_graph_document_list(
    llm, combined_chunk_document_list, allowedNodes, allowedRelationship
):
    futures = []
    graph_document_list = []
    if "diffbot_api_key" in dir(llm):
        llm_transformer = llm
    else:
        if "get_name" in dir(llm) and llm.get_name() != "ChatOenAI" or llm.get_name() != "ChatVertexAI" or llm.get_name() != "AzureChatOpenAI":
            node_properties = False
            relationship_properties = False
        else:
            node_properties = ["description"]
            relationship_properties = ["description"]
        llm_transformer = LLMGraphTransformer(
            llm=llm,
            node_properties=node_properties,
            relationship_properties=relationship_properties,
            allowed_nodes=allowedNodes,
            allowed_relationships=allowedRelationship,
            ignore_tool_usage=True,
        )
    
    if isinstance(llm,DiffbotGraphTransformer):
        graph_document_list = llm_transformer.convert_to_graph_documents(combined_chunk_document_list)
    else:
        graph_document_list = await llm_transformer.aconvert_to_graph_documents(combined_chunk_document_list)
    return graph_document_list


async def get_graph_from_llm(model, chunkId_chunkDoc_list, allowedNodes, allowedRelationship):
    try:
        llm, model_name = get_llm(model)
        combined_chunk_document_list = get_combined_chunks(chunkId_chunkDoc_list)
        
        if  allowedNodes is None or allowedNodes=="":
            allowedNodes =[]
        else:
            allowedNodes = allowedNodes.split(',')    
        if  allowedRelationship is None or allowedRelationship=="":   
            allowedRelationship=[]
        else:
            allowedRelationship = allowedRelationship.split(',')
            
        graph_document_list = await get_graph_document_list(
            llm, combined_chunk_document_list, allowedNodes, allowedRelationship
        )
        return graph_document_list
    except Exception as e:
        err = f"Error during extracting graph with llm: {e}"
        logging.error(err)
        raise 
