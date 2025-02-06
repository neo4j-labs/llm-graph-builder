import logging
from pathlib import Path
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_community.document_loaders import UnstructuredFileLoader
from langchain_core.documents import Document

def load_document_content(file_path):
    if Path(file_path).suffix.lower() == '.pdf':
        return PyMuPDFLoader(file_path)
    else:
        return UnstructuredFileLoader(file_path, mode="elements",autodetect_encoding=True)
    
def get_documents_from_file_by_path(file_path,file_name):
    file_path = Path(file_path)
    if file_path.exists():
        logging.info(f'file {file_name} processing')        
        file_extension = file_path.suffix.lower()
        try:
            loader = load_document_content(file_path)
            if file_extension == ".pdf":
                pages = loader.load()
            else:
                unstructured_pages = loader.load()   
                pages= get_pages_with_page_numbers(unstructured_pages)      
        except Exception as e:
            raise Exception('Error while reading the file content or metadata')
    else:
        logging.info(f'File {file_name} does not exist')
        raise Exception(f'File {file_name} does not exist')
    return file_name, pages , file_extension

def get_pages_with_page_numbers(unstructured_pages):
    pages = []
    page_number = 1
    page_content=''
    metadata = {}
    for page in unstructured_pages:
        if  'page_number' in page.metadata:
            if page.metadata['page_number']==page_number:
                page_content += page.page_content
                metadata = {'source':page.metadata['source'],'page_number':page_number, 'filename':page.metadata['filename'],
                        'filetype':page.metadata['filetype']}
                
            if page.metadata['page_number']>page_number:
                page_number+=1
                pages.append(Document(page_content = page_content))
                page_content='' 
                
            if page == unstructured_pages[-1]:
                pages.append(Document(page_content = page_content))
                    
        elif page.metadata['category']=='PageBreak' and page!=unstructured_pages[0]:
            page_number+=1
            pages.append(Document(page_content = page_content, metadata=metadata))
            page_content=''
            metadata={}
        
        else:
            page_content += page.page_content
            metadata_with_custom_page_number = {'source':page.metadata['source'],
                            'page_number':1, 'filename':page.metadata['filename'],
                            'filetype':page.metadata['filetype']}
            if page == unstructured_pages[-1]:
                    pages.append(Document(page_content = page_content, metadata=metadata_with_custom_page_number))
    return pages                
