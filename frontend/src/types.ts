import { Dispatch, ReactNode, SetStateAction } from 'react';

export interface CustomFile extends Partial<globalThis.File> {
  processing: number;
  status: string;
  NodesCount: number;
  id: string;
  relationshipCount: number;
  model: string;
  fileSource: string;
  source_url?: string;
  max_sources?: number;
  wiki_query?: string;
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
  file?: string;
  model: string;
  source_url?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  max_sources?: number;
  wiki_query?: string;
} & { [key: string]: any };

export type UploadParams = {
  file: string;
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
  max_limit?: number;
  query_source?: string;
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
  logo: any;
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
