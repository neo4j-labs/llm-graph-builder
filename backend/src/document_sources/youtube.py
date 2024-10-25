from pathlib import Path
from langchain.docstore.document import Document
from langchain_community.document_loaders import YoutubeLoader
from pytube import YouTube
from youtube_transcript_api import YouTubeTranscriptApi 
import logging
from urllib.parse import urlparse,parse_qs
from difflib import SequenceMatcher
from datetime import timedelta
from langchain_community.document_loaders.youtube import TranscriptFormat
from src.shared.constants import YOUTUBE_CHUNK_SIZE_SECONDS
from typing import List, Dict, Any 
import os
import re
from langchain_community.document_loaders import GoogleApiClient, GoogleApiYoutubeLoader

def get_youtube_transcript(youtube_id):
  try:
    #transcript = YouTubeTranscriptApi.get_transcript(youtube_id)
    # transcript_list = YouTubeTranscriptApi.list_transcripts(youtube_id)
    # transcript = transcript_list.find_transcript(["en"])
    # transcript_pieces: List[Dict[str, Any]] = transcript.fetch()
    proxy = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY") 
    proxies = { 'https': proxy }
    transcript_pieces = YouTubeTranscriptApi.get_transcript(youtube_id, proxies = proxies)
    return transcript_pieces
  except Exception as e:
    message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
    raise Exception(message)
  
# def get_youtube_combined_transcript(youtube_id):
#   try:
#     transcript_dict = get_youtube_transcript(youtube_id)
#     transcript = YouTubeTranscriptApi.get_transcript(youtube_id)
#     return transcript
#   except Exception as e:
#     message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
#     raise Exception(message)
  
def get_youtube_combined_transcript(youtube_id):
  try:
    transcript_dict = get_youtube_transcript(youtube_id)
    transcript=''
    for td in transcript_dict:
      transcript += ''.join(td['text'])
    return transcript
  except Exception as e:
    message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
    raise Exception(message)


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
      # youtube_loader = YoutubeLoader.from_youtube_url(url, 
      #                                                 language=["en-US", "en-gb", "en-ca", "en-au","zh-CN", "zh-Hans", "zh-TW", "fr-FR","de-DE","it-IT","ja-JP","pt-BR","ru-RU","es-ES"],
      #                                                 translation = "en",
      #                                                 add_video_info=True,
      #                                                 transcript_format=TranscriptFormat.CHUNKS,
      #                                                 chunk_size_seconds=YOUTUBE_CHUNK_SIZE_SECONDS)
      # video_id = parse_qs(urlparse(url).query).get('v')
      # cred_path = os.path.join(os.getcwd(),"llm-experiments_credentials.json")
      # print(f'Credential file path on youtube.py {cred_path}')
      # google_api_client = GoogleApiClient(service_account_path=Path(cred_path))
      # youtube_loader_channel = GoogleApiYoutubeLoader(
      # google_api_client=google_api_client,
      # video_ids=[video_id[0].strip()], add_video_info=True
      # )
      # youtube_transcript = youtube_loader_channel.load()
      # pages = youtube_loader.load()
      # print(f'youtube page_content: {youtube_transcript[0].page_content}')
      # print(f'youtube id: {youtube_transcript[0].metadata["id"]}')
      # print(f'youtube title: {youtube_transcript[0].metadata["snippet"]["title"]}')
      transcript= get_youtube_combined_transcript(match.group(1))
      file_name = match.group(1)#youtube_transcript[0].metadata["snippet"]["title"]
      pages = [Document(page_content=transcript)]
      return file_name, pages
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in reading transcript from youtube:{error_message}')
      raise Exception(error_message)  

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