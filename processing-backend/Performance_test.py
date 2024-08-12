import concurrent.futures
import requests
import time
API_BASE_URL = 'https://dev-backend-dcavk67s4a-uc.a.run.app'  
ENDPOINTS = {
    'get_sourcelist': '/sources_list',
    'get_health' : '/health',
    'post_connect' : '/connect',
    'chatbot': '/chat_bot',
    # 'post_chunk': '/chunk_entities' #'chatbot_details'
}


CONCURRENT_REQUESTS = 25  # Number of concurrent requests 
CHATBOT_MESSAGES = ["list out details of Patents of Jacob Einstein","hi","hello","mango","apple","amazon","Patrick pichette","Sunder pichai","tesla","Joe biden","Modi","AI","Neo4j","list out details of Patents of Jacob Einstein","hi","hello","mango","apple","amazon","Patrick pichette",]

#Source_list

# def get_request_sourcelist():
#     data = {'uri': '',
#     'database' : '',
#     'userName' : '',
#     'password' : ''}
#     #response = requests.get(ENDPOINTS['get_sourcelist'], headers=data)
#     response = requests.get(ENDPOINTS['get_sourcelist']) 
#     return response.status_code, response.text

#Connect

# def post_request_connect():
#     data = {'uri': '',
#     'database' : '',
#     'userName' : '',
#     'password' : ''}
#     response = requests.post(API_BASE_URL + ENDPOINTS['post_connect'], headers=data)
#     return response.status_code, response.text

#Chunk

def post_request_chunk():
    data = {'uri': '',
    'database' : '',
    'userName' : '',
    'password' : '',  
    'chunk_ids' : "14b337cdcab8f4c8006f7cd5a699ffe69f377e6c"
    }
    response = requests.post(API_BASE_URL + ENDPOINTS['post_chunk'], headers=data)
    return response.status_code, response.text

#chat_bot

# def chatbot_request(message): 
#     #data = {'message': message}  # Replacing with actual message
#     data = {"uri":"",
#         "database":"",
#         "userName":"",
#         "password": "",
#         "question": message,
#         "session_id": "697c0fa9-f340-4a8f-960b-50158d8ea804",
#         "model":    "openai-gpt-3.5",
#         "mode": "graph+vector",
#           "document_names": [] 
#                 } 
#     response = requests.post(API_BASE_URL + ENDPOINTS['chatbot'], data=data)
#     return response.status_code, response.text

#Health API

# def get_request_health():
#     response = requests.get(API_BASE_URL + ENDPOINTS['get_health'])
#     return response.status_code, response.text


def performance_main():
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
        # List of futures for all tasks
        futures = []

        # GET request futures
        # for _ in range(CONCURRENT_REQUESTS):
        #     futures.append(executor.submit(get_request_sourcelist))

        # GET request futures
        # for _ in range(CONCURRENT_REQUESTS):
        #     futures.append(executor.submit(get_request_health))

        # POST request futures
        # for _ in range(CONCURRENT_REQUESTS):
        #     futures.append(executor.submit(post_request_connect))

        # POST request futures
        for _ in range(CONCURRENT_REQUESTS):
            futures.append(executor.submit(post_request_chunk))

        #  Chatbot request futures
        # for message in CHATBOT_MESSAGES:
        #     futures.append(executor.submit(chatbot_request, message))
        
       

        # Process completed futures
        print(len(futures))
        for future in concurrent.futures.as_completed(futures):
            try:
                status_code, response_text = future.result()
                print(f'Status Code: {status_code}, Response: {response_text}')
            except Exception as e:
                print(f'Error: {e}')
    
    end_time = time.time()
    print(f'Total Time Taken: {end_time - start_time} seconds')

if __name__ == '__main__':
    performance_main()