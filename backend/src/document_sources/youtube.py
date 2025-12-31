import logging
import re
from datetime import timedelta
from difflib import SequenceMatcher

from langchain_core.documents import Document
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

from src.shared.llm_graph_builder_exception import LLMGraphBuilderException
from src.shared.common_fn import get_value_from_env
from src.shared.constants import YOUTUBE_CHUNK_SIZE_SECONDS

logger = logging.getLogger(__name__)


def get_youtube_transcript(youtube_id):
    """
    Fetches the transcript for a given YouTube video ID.

    Args:
        youtube_id (str): The YouTube video ID.

    Returns:
        list: List of transcript segments as dictionaries.

    Raises:
        LLMGraphBuilderException: If transcript is not available.
    """
    try:
        proxy = get_value_from_env("YOUTUBE_TRANSCRIPT_PROXY")
        proxy_config = GenericProxyConfig(http_url=proxy, https_url=proxy) if proxy else None
        youtube_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        transcript_pieces = youtube_api.fetch(youtube_id, preserve_formatting=True)
        return transcript_pieces.to_raw_data()
    except Exception as exc:
        message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
        raise LLMGraphBuilderException(message) from exc


def get_youtube_combined_transcript(youtube_id):
    """
    Returns the full transcript as a single string for a given YouTube video ID.

    Args:
        youtube_id (str): The YouTube video ID.

    Returns:
        str: The combined transcript text.

    Raises:
        LLMGraphBuilderException: If transcript is not available.
    """
    try:
        transcript_dict = get_youtube_transcript(youtube_id)
        transcript = ' '.join(td['text'] for td in transcript_dict)
        return transcript
    except Exception as exc:
        message = f"Youtube transcript is not available for youtube Id: {youtube_id}"
        raise LLMGraphBuilderException(message) from exc


def get_documents_from_youtube(url):
    """
    Splits a YouTube transcript into Document chunks based on YOUTUBE_CHUNK_SIZE_SECONDS.
    Returns the video ID and a list of Document objects.

    Args:
        url (str): The YouTube video URL.

    Returns:
        tuple: (youtube_id, list of Document objects)

    Raises:
        LLMGraphBuilderException: If transcript is not available or URL is invalid.
    """
    try:
        match = re.search(r'(?:v=)([0-9A-Za-z_-]{11})\s*', url)
        if not match:
            raise ValueError("Invalid YouTube URL or ID not found.")
        youtube_id = match.group(1)
        transcript = get_youtube_transcript(youtube_id)
        transcript_content = ''
        counter = YOUTUBE_CHUNK_SIZE_SECONDS
        pages = []
        for td in transcript:
            transcript_content += td['text'] + " "
            if td['start'] >= counter:
                pages.append(
                    Document(
                        page_content=transcript_content.strip(),
                        metadata={
                            'start_timestamp': str(timedelta(seconds=counter - YOUTUBE_CHUNK_SIZE_SECONDS)).split('.')[0],
                            'end_timestamp': str(timedelta(seconds=td['start'])).split('.')[0]
                        }
                    )
                )
                counter += YOUTUBE_CHUNK_SIZE_SECONDS
                transcript_content = ''
        if transcript:
            last_start = transcript[-1]['start']
        else:
            last_start = counter
        pages.append(
            Document(
                page_content=transcript_content.strip(),
                metadata={
                    'start_timestamp': str(timedelta(seconds=counter - YOUTUBE_CHUNK_SIZE_SECONDS)).split('.')[0],
                    'end_timestamp': str(timedelta(seconds=last_start)).split('.')[0]
                }
            )
        )
        return youtube_id, pages
    except Exception as exc:
        error_message = str(exc)
        logger.exception('Exception in reading transcript from youtube: %s', error_message)
        raise LLMGraphBuilderException(error_message) from exc


def get_calculated_timestamps(chunks, youtube_id):
    """
    Calculates and updates start and end timestamps for each chunk
    by matching chunk content to transcript segments.

    Args:
        chunks (list): List of Document chunks.
        youtube_id (str): The YouTube video ID.

    Returns:
        list: List of Document chunks with updated timestamps.
    """
    logger.info('Calculating timestamps for chunks')
    transcript = get_youtube_transcript(youtube_id)
    for chunk in chunks:
        max_start_similarity = 0
        max_end_similarity = 0
        start_time = 0
        end_time = 0
        start_content = chunk.page_content[:40].strip().replace('\n', ' ')
        end_content = chunk.page_content[-40:].strip().replace('\n', ' ')
        for segment in transcript:
            segment_text = segment['text'].replace('\n', ' ')
            start_similarity = SequenceMatcher(None, start_content, segment_text).ratio()
            end_similarity = SequenceMatcher(None, end_content, segment_text).ratio()
            if start_similarity > max_start_similarity:
                max_start_similarity = start_similarity
                start_time = segment['start']
            if end_similarity > max_end_similarity:
                max_end_similarity = end_similarity
                end_time = segment['start'] + segment['duration']
        chunk.metadata['start_timestamp'] = str(timedelta(seconds=start_time)).split('.')[0]
        chunk.metadata['end_timestamp'] = str(timedelta(seconds=end_time)).split('.')[0]
    return chunks


def get_chunks_with_timestamps(chunks):
    """
    Adds end_timestamp to each chunk based on start_seconds + 60.

    Args:
        chunks (list): List of Document chunks.

    Returns:
        list: List of Document chunks with updated end_timestamp.
    """
    logger.info('Adding end_timestamp to chunks')
    for chunk in chunks:
        start_seconds = chunk.metadata.get('start_seconds', 0)
        chunk.metadata['end_timestamp'] = str(timedelta(seconds=start_seconds + 60)).split('.')[0]
    return chunks