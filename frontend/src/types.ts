import { AxiosResponse } from 'axios';
import { Dispatch, ReactNode, SetStateAction } from 'react';

export interface CustomFile extends Partial<globalThis.File> {
  processing: number | string;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
  model: string;
  fileSource: string;
  source_url?: string;
  wiki_query?: string;
  gcsBucket?: string;
  gcsBucketFolder?: string;
  errorMessage?: string;
}

export interface OptionType {
  value: string;
  label: string;
}

export type UserCredentials = {
  uri: string;
  userName: string;
  password: string;
  database?: string;
} & { [key: string]: any };

export type ExtractParams = {
  file?: File;
  model: string;
  source_url?: string;
  aws_access_key_id?: string | null;
  aws_secret_access_key?: string | null;
  max_sources?: number;
  wiki_query?: string;
  gcs_bucket_name?: string;
  gcs_bucket_folder?: string;
  gcs_blob_filename?: string;
  source_type?: string;
} & { [key: string]: any };

export type UploadParams = {
  file: File;
  model: string;
} & { [key: string]: any };

export type FormDataParams = ExtractParams | UploadParams;

export interface DropdownProps {
  onSelect: (option: OptionType | null | void) => void;
  isDisabled: boolean;
}

export interface CustomAlertProps {
  open: boolean;
  handleClose: () => void;
  alertMessage: string;
}

export interface DataComponentProps {
  openModal: () => void;
}

export interface S3ModalProps {
  hideModal: () => void;
  open: boolean;
}

export interface ConnectionModalProps {
  open: boolean;
  setOpenConnection: Dispatch<SetStateAction<boolean>>;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
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
  url?: string;
  awsAccessKeyId?: string;
  fileSource: string;
  gcsBucket?: string;
  gcsBucketFolder?: string;
  errorMessage?: string;
}

export interface SideNavProps {
  openDrawer: () => void;
  closeDrawer: () => void;
  isExpanded: boolean;
}

export interface DrawerProps {
  isExpanded: boolean;
}

export interface ContentProps {
  isExpanded: boolean;
  showChatBot: boolean;
  openChatBot: () => void;
}

export interface FileTableProps {
  isExpanded: boolean;
  connectionStatus: boolean;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
  onInspect: (id: string) => void;
}

export interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  submitLabel: string;
  submitHandler: () => void;
  statusMessage: string;
  status: 'unknown' | 'success' | 'info' | 'warning' | 'danger';
  setStatus: Dispatch<SetStateAction<'unknown' | 'success' | 'info' | 'warning' | 'danger'>>;
}

export interface CommonButtonProps {
  openModal: () => void;
  wrapperclassName?: string;
  logo: string;
  title: string;
  className?: string;
}

export interface messages {
  id: number;
  message: string;
  user: string;
  datetime: string;
  isTyping?: boolean;
}

export type ChatbotProps = {
  messages: {
    id: number;
    user: string;
    message: string;
    datetime: string;
    isTyping?: boolean;
  }[];
  setMessages: Dispatch<SetStateAction<messages[]>>;
};
export interface WikipediaModalTypes {
  hideModal: () => void;
  open: boolean;
}

export interface GraphViewModalProps {
  open: boolean;
  inspectedName: string;
  setGraphViewOpen: Dispatch<SetStateAction<boolean>>;
  viewPoint: string;
}

export type GraphType = 'Document' | 'Chunks' | 'Entities';

export interface fileName {
  fileName: string;
  fileSize: number;
  url: string;
  gcsBucket?: string;
  gcsBucketFolder?: string;
}
export interface URLSCAN_RESPONSE {
  status: string;
  success_count?: number;
  failed_count?: number;
  message: string;
  file_name?: fileName[];
  error?: string;
  file_source?: string;
  data?: any;
}

export interface ServerResponse extends Partial<AxiosResponse> {
  data: URLSCAN_RESPONSE;
}
export interface ScanProps {
  urlParam?: string;
  userCredentials: UserCredentials | null;
  model?: string;
  accessKey?: string;
  secretKey?: string;
  wikiquery?: string;
  gcs_bucket_name?: string;
  gcs_bucket_folder?: string;
  source_type?: string;
}
