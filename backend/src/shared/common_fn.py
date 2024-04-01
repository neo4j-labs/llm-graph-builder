import logging
from src.document_sources.youtube import create_youtube_url
import re

def check_url_source(url):
    try:
      logging.info(f"incoming URL: {url}")
      if "youtu" in url:
        youtube_url = create_youtube_url(url)
        logging.info(youtube_url)
      else:
        youtube_url=''

      youtube_id_regex = re.search(r"v=([a-zA-Z0-9_-]+)", youtube_url)
      if url.startswith('s3://'):
        source ='s3 bucket'
        
      elif youtube_url.startswith("https://www.youtube.com/watch?") and youtube_id_regex is not None:
        if len(youtube_id_regex.group(1)) == 11:
            source = 'youtube'
            #re.match('^(https?:\/\/)?(www\.|m\.)?youtube\.com\/(c\/[^\/\?]+\/|channel\/[^\/\?]+\/|user\/[^\/\?]+\/)?(watch\?v=[^&\s]+|embed\/[^\/\?]+|[^\/\?]+)(&[^?\s]*)?$',url) :
        else :
          source = 'Invalid'
      else:
        source = 'Invalid'
      
      return source,youtube_url
    except Exception as e:
      logging.error(f"Error in recognize URL: {e}")  
      raise Exception(e)


def get_chunk_and_graphDocument(graph_document_list, lst_chunks):
  logging.info("creating list of chunks and graph documents in get_chunk_and_graphDocument func")
  lst_chunk_chunkId_document=[]
  for graph_document in graph_document_list:
            for index, chunk in enumerate(lst_chunks):
                if graph_document.source.page_content == chunk['chunk_doc'].page_content:
                    position = index+1
                    lst_chunk_chunkId_document.append({'position':position,'graph_doc':graph_document,'chunk_id':chunk['chunk_id']})
                    break 
  return lst_chunk_chunkId_document                   