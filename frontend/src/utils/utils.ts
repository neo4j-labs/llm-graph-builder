export const url = () => {
  if (process.env.BACKEND_API_URL !== undefined) {
    return process.env.BACKEND_API_URL;
  }
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
  console.log(file.name)
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
  console.log(filename)
  const base64String = localStorage.getItem(filename);
  if (base64String) {
    const file = base64ToFile(base64String, filename);
    console.log('File fetched from local storage:', file);
    return file;
  } else {
    console.error('File not found in local storage');
    return null;
  }
};
