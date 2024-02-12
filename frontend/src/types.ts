export interface CustomFile extends Partial<globalThis.File> {
  processing: string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
  model: string;
}

export interface OptionType {
  value: string;
  label: string;
}

export interface SourceNode {
  fileName: string;
  fileSize: number;
  fileType?: string;
  nodeCount?: number;
  processingTime?: string;
  relationshipCount?: number;
  model: string;
  status: string;
}

export interface DropdownProps {
  onSelect: (option: OptionType | null | void) => void;
}

export type UserCredentials = {
  uri: string;
  userName: string;
  password: string;
};

export type ExtractParams={
  file: string,
  model: string,
}
export type UploadParams={
  file: string
}

export type FormDataParams =(ExtractParams | UploadParams)