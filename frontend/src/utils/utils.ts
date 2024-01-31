export const url = () => {
  if (process.env.BACKEND_API_URL !== undefined) {
    return process.env.BACKEND_API_URL;
  }
};

export const formatFileSize = (bytes: any) => {
  return (bytes / (1024 * 1024)).toFixed(2) + 'mb';
};
