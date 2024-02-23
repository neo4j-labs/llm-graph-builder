//Get the Url 
export const url = () => {
  let url = window.location.href.replace('5173', '8000');
  if (process.env.BACKEND_API_URL) {
    url = process.env.BACKEND_API_URL;
  }
  return !url || !url.match('/$') ? url : url.substring(0, url.length - 1);
};

export const formatFileSize = (bytes: any) => {
  return (bytes / (1024 * 1024)).toFixed(2) + 'mb';
};

export const fileToBase64 = (file: any) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Save file to local storage
export const saveFileToLocal = async (file: any) => {
  try {
    const base64String: any = await fileToBase64(file);
    localStorage.setItem(`${file.name}`, base64String);
    console.log('File saved to local storage');
  } catch (error) {
    console.error('Error saving file to local storage:', error);
  }
};

export const base64ToFile = (base64String: any, fileName: any) => {
  const byteCharacters = atob(base64String.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const file = new File(byteArrays, fileName, { type: 'application/pdf' });
  return file;
};

// Retrieve file from local storage
export const getFileFromLocal = (filename: string) => {
  const base64String = localStorage.getItem(filename);
  if (base64String) {
    const file = base64ToFile(base64String, filename);
    console.log('File fetched from local storage:', file);
    return file;
  }
  return null;
};

//Status indicator icons to status column
export const statusCheck = (status: string) => {
  switch (status) {
    case "Completed":
      return "success";
    case "Processing":
      return "warning";
    case "Uploading":
      return "warning"
    case "Failed":
      return "danger";
    case "New":
      return "info";
  }
}