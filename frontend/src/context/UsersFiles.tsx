import { createContext, useContext, useState, Dispatch, SetStateAction, FC, useEffect } from 'react';
import { CustomFile, FileContextProviderProps, OptionType } from '../types';
import { defaultLLM } from '../utils/Constants';
import { useCredentials } from './UserCredentials';

interface FileContextType {
  files: (File | null)[] | [];
  filesData: CustomFile[] | [];
  setFiles: Dispatch<SetStateAction<(File | null)[]>>;
  setFilesData: Dispatch<SetStateAction<CustomFile[]>>;
  model: string;
  setModel: Dispatch<SetStateAction<string>>;
  graphType: string;
  setGraphType: Dispatch<SetStateAction<string>>;
  selectedNodes: readonly OptionType[];
  setSelectedNodes: Dispatch<SetStateAction<readonly OptionType[]>>;
  selectedRels: readonly OptionType[];
  setSelectedRels: Dispatch<SetStateAction<readonly OptionType[]>>;
  rowSelection: Record<string, boolean>;
  setRowSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedRows: string[];
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  selectedSchemas: readonly OptionType[];
  setSelectedSchemas: Dispatch<SetStateAction<readonly OptionType[]>>;
}
const FileContext = createContext<FileContextType | undefined>(undefined);

const FileContextProvider: FC<FileContextProviderProps> = ({ children }) => {
  const selectedNodeLabelstr = localStorage.getItem('selectedNodeLabels');
  const selectedNodeRelsstr = localStorage.getItem('selectedRelationshipLabels');

  const [files, setFiles] = useState<(File | null)[] | []>([]);
  const [filesData, setFilesData] = useState<CustomFile[] | []>([]);
  const [model, setModel] = useState<string>(defaultLLM);
  const [graphType, setGraphType] = useState<string>('Knowledge Graph Entities');
  const [selectedNodes, setSelectedNodes] = useState<readonly OptionType[]>([]);
  const [selectedRels, setSelectedRels] = useState<readonly OptionType[]>([]);
  const [selectedSchemas, setSelectedSchemas] = useState<readonly OptionType[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { userCredentials } = useCredentials();

  useEffect(() => {
    if (selectedNodeLabelstr != null) {
      const selectedNodeLabel = JSON.parse(selectedNodeLabelstr);
      if (userCredentials?.uri === selectedNodeLabel.db) {
        setSelectedNodes(selectedNodeLabel.selectedOptions);
      }
    }
    if (selectedNodeRelsstr != null) {
      const selectedNodeRels = JSON.parse(selectedNodeRelsstr);
      if (userCredentials?.uri === selectedNodeRels.db) {
        setSelectedRels(selectedNodeRels.selectedOptions);
      }
    }
  }, [userCredentials]);

  const value: FileContextType = {
    files,
    filesData,
    setFiles,
    setFilesData,
    model,
    setModel,
    graphType,
    setGraphType,
    selectedRels,
    setSelectedRels,
    selectedNodes,
    setSelectedNodes,
    rowSelection,
    setRowSelection,
    selectedRows,
    setSelectedRows,
    selectedSchemas,
    setSelectedSchemas,
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
