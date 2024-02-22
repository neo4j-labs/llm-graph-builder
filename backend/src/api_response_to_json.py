import json

def update_response_to_jsonFile(graph_documents,
                                model,
                                file,
                                processing_time,
                                node_count,
                                relations_count):
  """
   Writes the /extract API response in json
   1. If new model doesn't exist in json file then it creates a new entry.
   2. If model exist and new file is uploaded then new file's response is appended to model's list
   3. If model and file both exists in json then that record is updated with latest response.  
   
   Args:
   	 graph_documents: response from LLMs in list of GraphDocument format.
   	 model: Model/LLM choosen for KG creation
   	 file: Uploaded file name
     processing_time : Processing time taken for graph generation
     node_count : Number of nodes created from file
     relations_count : Number of relations created from file
   
   Returns: 
   	 Updates data/llm_comparision.json file.
  """
  
  graph_dict = {
    "nodes": [],
    "relationships": []
  }
  
  file_exist = 'false'
  json_file_path = '../data/llm_comparision.json'
  
  for graph_document in graph_documents:
      for node in graph_document.nodes:
          graph_dict["nodes"].append({
          "id": node.id, "label": node.type, "properties": node.properties
        })
        
      for relationship in graph_document.relationships:
          graph_dict["relationships"].append({
          "source": {"id": relationship.source.id,"label": relationship.source.type
          },
          "target": {"id": relationship.target.id,"label": relationship.target.type
          },
          "type": relationship.type,
          "properties": relationship.properties
        }) 
        
  data = {
            "file" : file, 
            "processing time" : round(processing_time.total_seconds(),2), 
            "node count" : node_count, 
            "relation count" : relations_count,
            "nodes" : graph_dict["nodes"],
            "relationships" : graph_dict["relationships"] 
            }
  llm_data = { model : data
        }
  print(llm_data)
  with open(json_file_path, 'r') as json_file :
    json_file_data = json.load(json_file)

  # Add new model to the json data
  if model not in json_file_data.keys():
        json_file_data.update({model : [data]})    
  
  else :
  # Check if file already exist  
    for i,existing_data in enumerate(json_file_data[model]):
      if llm_data[model]['file'] == json_file_data[model][i]['file']:
          file_exist = 'true'
          break
    # Replace existing record with new response    
    if file_exist == 'true': 
      json_file_data[model][i] = llm_data[model] 
    #  Add new file response to model  
    else:
      json_file_data[model].append(llm_data[model])  

  with open(json_file_path, 'w') as json_file :
    json.dump(json_file_data, json_file, indent=4)      
   