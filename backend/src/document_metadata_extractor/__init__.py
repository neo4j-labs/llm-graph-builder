from .metadata_processor import MetadataProcessor, DocumentMetadata, MetadataExtractor
from .domain_extractor import DomainExtractor

def create_metadata_processor() -> MetadataProcessor:
    """Create and configure a metadata processor with default extractors"""
    processor = MetadataProcessor()
    processor.add_extractor(DomainExtractor())
    return processor

__all__ = [
    'MetadataProcessor',
    'DocumentMetadata',
    'MetadataExtractor',
    'DomainExtractor',
    'create_metadata_processor'
] 