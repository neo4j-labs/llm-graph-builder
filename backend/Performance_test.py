import concurrent.futures
import requests
import time
API_BASE_URL = 'https://dev-backend-dcavk67s4a-uc.a.run.app'  
ENDPOINTS = {
    'get_sourcelist': '/sources_list?uri=neo4j+s://73b760b4.databases.neo4j.io:7687&database=neo4j&userName=neo4j&password=SHF3QXpmRzgzWHdjRVEtbXZFRzR5TnBjUlRITXBzZ1phWVczcUlHSmgySQ==',
    'get_health' : '/health',
    'post_connect' : '/connect',
    'chatbot': '/chat_bot',
    # 'post_chunk': '/chunk_entities' #'chatbot_details'
}


CONCURRENT_REQUESTS = 1  # Number of concurrent requests # 25to do....50
CHATBOT_MESSAGES = ["list out details of Patents of Jacob Einstein"]

def get_request_sourcelist():
    data = {'uri': 'neo4j+s://73b760b4.databases.neo4j.io:7687',
    'database' : 'neo4j',
    'userName' : 'neo4j',
    'password' : 'SHF3QXpmRzgzWHdjRVEtbXZFRzR5TnBjUlRITXBzZ1phWVczcUlHSmgySQ=='}
    response = requests.get(API_BASE_URL + ENDPOINTS['get_sourcelist'], headers=data) 
    return response.status_code, response.text


def post_request_connect():
    data = {'uri': 'neo4j+s://73b760b4.databases.neo4j.io:7687',
    'database' : 'neo4j',
    'userName' : 'neo4j',
    'password' : 'HqwAzfG83XwcEQ-mvEG4yNpcRTHMpsgZaYW3qIGJh2I'}
    response = requests.post(API_BASE_URL + ENDPOINTS['post_connect'], headers=data)
    return response.status_code, response.text

# def post_request_chunk():
#     data = {'uri': 'neo4j+s://73b760b4.databases.neo4j.io:7687',
#     'database' : 'neo4j',
#     'userName' : 'neo4j',
#     'password' : 'HqwAzfG83XwcEQ-mvEG4yNpcRTHMpsgZaYW3qIGJh2I',  
#     'chunk_ids' : "9601cfdc7e7eb5b3f53db06f164c3d5a09848952"
#     }
#     response = requests.post(API_BASE_URL + ENDPOINTS['post_chunk'], headers=data)
#     return response.status_code, response.text

def chatbot_request(message): 
    #data = {'message': message}  # Replacing with actual message
    data = {"uri":"neo4j+s://73b760b4.databases.neo4j.io:7687",
        "database":"neo4j",
        "userName":"neo4j",
        "password": "HqwAzfG83XwcEQ-mvEG4yNpcRTHMpsgZaYW3qIGJh2I",
        "question": message,
        "session_id": "56fdbc27-fd94-4b57-a6db-873dade5ba3b",
        "model":    "gpt-3.5",
        "mode": "graph+vector"
                } 
    response = requests.post(API_BASE_URL + ENDPOINTS['chatbot'], data=data)
    return response.status_code, response.text

def get_request_health():
    response = requests.get(API_BASE_URL + ENDPOINTS['get_health']). # target <10 ms comment
    return response.status_code, response.text


def performance_main():
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
        # List of futures for all tasks
        futures = []

        # GET request futures
        for _ in range(CONCURRENT_REQUESTS):
            futures.append(executor.submit(get_request_sourcelist))

        # GET request futures
        for _ in range(CONCURRENT_REQUESTS):
            futures.append(executor.submit(get_request_health))

        # POST request futures
        for _ in range(CONCURRENT_REQUESTS):
            futures.append(executor.submit(post_request_connect))

        # POST request futures
        # for _ in range(CONCURRENT_REQUESTS):
        #     futures.append(executor.submit(post_request_chunk))

        # # Chatbot request futures
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