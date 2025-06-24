from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod
import logging
from datetime import datetime

@dataclass
class DocumentMetadata:
    """Container for document-level metadata"""
    title: Optional[str] = None
    author: Optional[str] = None
    date: Optional[datetime] = None
    language: Optional[str] = None
    domain: Optional[str] = None
    keywords: List[str] = None
    summary: Optional[str] = None
    custom_metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.custom_metadata is None:
            self.custom_metadata = {}

class MetadataExtractor(ABC):
    """Abstract base class for metadata extractors"""
    
    @abstractmethod
    def extract(self, pages: str, file_name: str) -> DocumentMetadata:
        """Extract metadata from document content"""
        pass

class MetadataProcessor:
    """Orchestrates metadata extraction using multiple extractors"""
    
    def __init__(self):
        self.extractors: List[MetadataExtractor] = []
        
    def add_extractor(self, extractor: MetadataExtractor):
        """Add a metadata extractor to the pipeline"""
        self.extractors.append(extractor)
        
    def process_document(self, document_content: str, file_name: str) -> DocumentMetadata:
        """Process document through all extractors and combine results"""
        metadata = DocumentMetadata()
        
        for extractor in self.extractors:
            try:
                extracted = extractor.extract(document_content, file_name)
                # Merge extracted metadata
                for field in metadata.__dataclass_fields__:
                    value = getattr(extracted, field)
                    if value is not None:
                        setattr(metadata, field, value)
            except Exception as e:
                logging.error(f"Error in {extractor.__class__.__name__}: {str(e)}")
                
        return metadata

# Factory function to create a configured metadata processor
def create_metadata_processor() -> MetadataProcessor:
    """Create and configure a metadata processor with default extractors"""
    processor = MetadataProcessor()
    # processor.add_extractor(TitleExtractor())
    # processor.add_extractor(DomainClassifier())
    return processor 