import logging
from langchain_community.document_loaders import PyPDFLoader

def get_documents_from_file(file):
    file_name = file.filename
    logging.info(f"get_documents_from_file called for filename = {file_name}")
    # file_key=file_name
        
    with open('temp.pdf','wb') as f:
        f.write(file.file.read())
    loader = PyPDFLoader('temp.pdf')
    pages = loader.load_and_split()
    return file_name, pages