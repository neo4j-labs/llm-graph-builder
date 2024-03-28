import logging
from src.document_sources.youtube import create_youtube_url


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