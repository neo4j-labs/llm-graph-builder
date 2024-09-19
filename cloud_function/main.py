# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


from dotenv import load_dotenv
from pathlib import Path
from langchain_community.document_loaders import GoogleApiClient, GoogleApiYoutubeLoader
load_dotenv()
from pathlib import Path

def getTranscript_title_from_youtube_URL(request, video_id:string):

	google_api_client = GoogleApiClient(service_account_path=Path("D:\\llm-graph-builder\\backend\\llm-experiments_credentials.json"))
	# Use a Channel
	youtube_loader_channel = GoogleApiYoutubeLoader(
	google_api_client=google_api_client,
	video_ids=[video_id], add_video_info=True
	)
	# returns a list of Documents
	youtube_transcript = youtube_loader_channel.load()
	title = youtube_transcript[0].metadata["snippet"]["title"]
	page_content = youtube_transcript[0].page_content
	# print(f'youtube page_content: {abc}')
	# print(f'youtube id: {abc[0].metadata["id"]}')
	# print(f'youtube title: {abc[0].metadata["snippet"]["title"]}')
	
	return {'page_content': page_content, 'title': title}