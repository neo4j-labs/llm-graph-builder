from langchain.docstore.document import Document
from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from youtube_transcript_api import YouTubeTranscriptApi 
from youtube_transcript_api.proxies import GenericProxyConfig
import logging
from urllib.parse import urlparse,parse_qs
from difflib import SequenceMatcher
from datetime import timedelta
from src.shared.constants import YOUTUBE_CHUNK_SIZE_SECONDS
import os
import re

def get_youtube_transcript(youtube_id):
  try:
    proxy = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY") 
    proxy_config = GenericProxyConfig(http_url=proxy, https_url=proxy) if proxy else None
    youtube_api = YouTubeTranscriptApi(proxy_config=proxy_config)
    transcript_pieces = youtube_api.fetch(youtube_id, preserve_formatting=True)
    transcript_pieces = transcript_pieces.to_raw_data()
    return transcript_pieces
  except Exception as e:
    message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
    raise LLMGraphBuilderException(message)
  
def get_youtube_combined_transcript(youtube_id):
  try:
    transcript_dict = get_youtube_transcript(youtube_id)
    transcript=''
    for td in transcript_dict:
      transcript += ''.join(td['text'])+" "
    return transcript
  except Exception as e:
    message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
    raise LLMGraphBuilderException(message)


def create_youtube_url(url):
    you_tu_url = "https://www.youtube.com/watch?v="
    u_pars = urlparse(url)
    quer_v = parse_qs(u_pars.query).get('v')
    if quer_v:
      return  you_tu_url + quer_v[0].strip()

    pth = u_pars.path.split('/')
    if pth:
      return you_tu_url + pth[-1].strip()

  
def get_documents_from_youtube(url):
    try:
      match = re.search(r'(?:v=)([0-9A-Za-z_-]{11})\s*',url)
      transcript= get_youtube_transcript(match.group(1))
      transcript_content=''
      counter = YOUTUBE_CHUNK_SIZE_SECONDS 
      pages = []
      for i, td in enumerate(transcript):
          if td['start'] < counter:
              transcript_content += ''.join(td['text'])+" "
          else :
              transcript_content += ''.join(td['text'])+" "
              pages.append(Document(page_content=transcript_content.strip(), metadata={'start_timestamp':str(timedelta(seconds = counter-YOUTUBE_CHUNK_SIZE_SECONDS)).split('.')[0], 'end_timestamp':str(timedelta(seconds = td['start'])).split('.')[0]}))
              counter += YOUTUBE_CHUNK_SIZE_SECONDS  
              transcript_content=''  
      pages.append(Document(page_content=transcript_content.strip(), metadata={'start_timestamp':str(timedelta(seconds = counter-YOUTUBE_CHUNK_SIZE_SECONDS)).split('.')[0], 'end_timestamp':str(timedelta(seconds =transcript[-1]['start'] if transcript else counter)).split('.')[0]})) # Handle empty transcript_pieces
      file_name = match.group(1)#youtube_transcript[0].metadata["snippet"]["title"]
      return file_name, pages
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in reading transcript from youtube:{error_message}')
      raise LLMGraphBuilderException(error_message)  

def get_calculated_timestamps(chunks, youtube_id):
  logging.info('Calculating timestamps for chunks')
  max_start_similarity=0
  max_end_similarity=0
  transcript = get_youtube_transcript(youtube_id)
  for chunk in chunks:
    start_content = chunk.page_content[:40].strip().replace('\n', ' ')
    end_content = chunk.page_content[-40:].strip().replace('\n', ' ')
    for segment in transcript:
        segment['text'] = segment['text'].replace('\n', ' ')
        start_similarity = SequenceMatcher(None, start_content, segment['text'])
        end_similarity = SequenceMatcher(None, end_content, segment['text'])
        
        if start_similarity.ratio() > max_start_similarity:
            max_start_similarity = start_similarity.ratio()
            start_time = segment['start']
            
        if end_similarity.ratio() > max_end_similarity:
            max_end_similarity = end_similarity.ratio()
            end_time = segment['start']+segment['duration'] 
                   
    chunk.metadata['start_timestamp'] = str(timedelta(seconds = start_time)).split('.')[0]
    chunk.metadata['end_timestamp'] = str(timedelta(seconds = end_time)).split('.')[0]
    max_start_similarity=0
    max_end_similarity=0
  return chunks

def get_chunks_with_timestamps(chunks):
  logging.info('adding end_timestamp to chunks')
  for chunk in chunks :
    chunk.metadata['end_timestamp'] = str(timedelta(seconds = chunk.metadata['start_seconds']+60)).split('.')[0]
  return chunks