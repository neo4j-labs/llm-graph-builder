from langchain_community.document_loaders import YoutubeLoader
from pytube import YouTube
from youtube_transcript_api import YouTubeTranscriptApi 
import logging
from urllib.parse import urlparse,parse_qs

def get_youtube_transcript(youtube_id):
  try:
    transcript_dict = YouTubeTranscriptApi.get_transcript(youtube_id)
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
      youtube_loader = YoutubeLoader.from_youtube_url(url, 
                                                      language=["en-US", "en-gb", "en-ca", "en-au","zh-CN", "zh-Hans", "zh-TW", "fr-FR","de-DE","it-IT","ja-JP","pt-BR","ru-RU","es-ES"],
                                                      translation = "en",
                                                      add_video_info=True)
      pages = youtube_loader.load()
      file_name = YouTube(url).title
      return file_name, pages
    except Exception as e:
      error_message = str(e)
      logging.exception(f'Exception in reading transcript from youtube:{error_message}')
      raise Exception(error_message)  
