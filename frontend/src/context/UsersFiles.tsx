import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
  model: string;
  s3url?:string
}
interface FileContextType {
  files: File[] | [];
  filesData: CustomFile[] | [];
  setFiles: Dispatch<SetStateAction<File[]>>;
  setFilesData: Dispatch<SetStateAction<CustomFile[]>>;
  model: string;
  setModel: Dispatch<SetStateAction<string>>;
}
const FileContext = createContext<FileContextType | undefined>(undefined);
interface FileContextProviderProps {
  children: ReactNode;
}
const FileContextProvider: React.FC<FileContextProviderProps> = ({ children }) => {
  const [files, setFiles] = useState<File[] | []>([]);
  const [filesData, setFilesData] = useState<CustomFile[] | []>([]);
  const [model, setModel] = useState<string>('Diffbot');
  const value: FileContextType = {
    files,
    filesData,
    setFiles,
    setFilesData,
    model,
    setModel,
  };
  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};
const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileContextProvider');
  }
  return context;
};
export { FileContextProvider, useFileContext };
