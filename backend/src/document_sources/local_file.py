import logging
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from langchain_community.document_loaders import PyPDFLoader

# def get_documents_from_file_by_bytes(file):
#     file_name = file.filename
#     logging.info(f"get_documents_from_file called for filename = {file_name}")
#     suffix = Path(file.filename).suffix
#     with NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
#         shutil.copyfileobj(file.file, tmp)
#         tmp_path = Path(tmp.name)
#         loader = PyPDFLoader(str(tmp_path))
#         pages = loader.load_and_split()
#     return file_name, pages

def get_documents_from_file_by_path(file_path,file_name):
    file_path = Path(file_path)
    if file_path.exists():
        logging.info(f'file {file_name} processing')
        loader = PyPDFLoader(str(file_path))
        pages = loader.load_and_split()
    else:
        logging.info(f'File {file_name} does not exist')
        raise Exception(f'File {file_name} does not exist')
    
    return file_name, pages 