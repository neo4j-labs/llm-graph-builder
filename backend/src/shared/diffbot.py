import requests
from dataclasses import dataclass, field
from typing import List, Optional

class DiffbotGraphTransformer:
    def __init__(self, diffbot_api_key: str, extract_types: List[str] = ["facts"]):
        self.api_key = diffbot_api_key
        self.extract_types = extract_types

    def convert_to_graph_documents(self, documents):
        graph_docs = []
        for doc in documents:
            response = requests.post(
                    "https://nl.diffbot.com/v1/",
                    params={"token": self.api_key},
                    json={
                    "content": [{"value": doc.page_content}],
                    "conf": {
                    "types": self.extract_types,
                    "threshold": 0.7
                        }
                    }
                )
            graph_docs.append(response.json())
        return graph_docs
        
@dataclass
class GraphNode:
    id: str
    type: str

@dataclass
class GraphRelationship:
    source: GraphNode
    target: GraphNode
    type: str

@dataclass
class Graph:
    nodes: List[GraphNode] = field(default_factory=list)
    relationships: List[GraphRelationship] = field(default_factory=list)