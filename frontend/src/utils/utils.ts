export const url = () => {
  var url = window.location.href.replace("5173","8000");
  if (process.env.BACKEND_API_URL) {
    url = process.env.BACKEND_API_URL;
  }
  return !url || !url.match("/$") ? url : url.substring(0, url.length-1);
};

export const formatFileSize = (bytes: any) => {
  return (bytes / (1024 * 1024)).toFixed(2) + 'mb';
};
