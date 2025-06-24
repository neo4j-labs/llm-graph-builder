from contextgem import Document as ContextGemDocument, DocumentLLM, LabelConcept
from langchain.schema import Document
from .metadata_processor import MetadataExtractor, DocumentMetadata
from typing import List

DOMAIN_LABELS = [
    "Multiple Myeloma",
    "Emotional Intelligence",
    "Business Management",
    "Instruction Manual",
    "Sales Training",
    "Leadership Coaching",
]

class DomainExtractor(MetadataExtractor):
    """Classifies document into knowledge domains"""

    def __init__(self):
        super().__init__()
        self.num_pages = 20

    def extract(self, pages: List[Document], file_name: str) -> DocumentMetadata:
        raw_text = f"filename: {file_name}" + "\n".join([page.page_content for page in pages[:self.num_pages]])
        print("classification raw text: ", raw_text)
        contextgem_doc = ContextGemDocument(raw_text=raw_text)

        # Define a LabelConcept for contract type classification
        document_type_concept = LabelConcept(
            name="Document Domain Label",
            description="Classify the knowledge domain of the document",
            labels=DOMAIN_LABELS,
            classification_type="multi_class",  # only one label can be selected (mutually exclusive labels)
            singular_occurrence=True,  # expect only one classification result
        )

        contextgem_doc.add_concepts([document_type_concept])

        model = "ollama/phi4:14b"
        llm = DocumentLLM(
            model=model,
            # api_key=os.getenv("CONTEXTGEM_OPENAI_API_KEY"),
        )

        concept_label = llm.extract_concepts_from_document(contextgem_doc)[0]

        if concept_label.extracted_items:
            # Get the classified document type
            classified_type = concept_label.extracted_items[0].value
            print(f"Document: {file_name}, classified as: {classified_type}")  # Output: ['NDA']        
            return DocumentMetadata(domain=classified_type)
        else: 
            print(f"no label assigned to document {file_name}")
            return DocumentMetadata(domain=None)
        
