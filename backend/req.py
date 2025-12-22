import requests
from packaging.requirements import Requirement
def get_latest_version(package_name):
   url = f"https://pypi.org/pypi/{package_name}/json"
   try:
       response = requests.get(url, timeout=10)
       if response.status_code == 200:
           data = response.json()
           return data["info"]["version"]
   except Exception as e:
       print(f"Failed to fetch version for {package_name}: {e}")
   return None
def update_requirements(input_file='requirements.txt', output_file='requirements_latest.txt'):
   with open(input_file, 'r') as f:
       lines = f.readlines()
   updated_lines = []
   for line in lines:
       line = line.strip()
       if not line or line.startswith('#'):
           updated_lines.append(line)
           continue
       try:
           req = Requirement(line)
           package = req.name
           latest_version = get_latest_version(package)
           if latest_version:
               updated_lines.append(f"{package}=={latest_version}")
           else:
               updated_lines.append(line)
       except Exception as e:
           print(f"Skipping line '{line}' due to error: {e}")
           updated_lines.append(line)
   with open(output_file, 'w') as f:
       f.write('\n'.join(updated_lines))
   print(f"Updated requirements saved to {output_file}")
   
if __name__ == '__main__':
   update_requirements()