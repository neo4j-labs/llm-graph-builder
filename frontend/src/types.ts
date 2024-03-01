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
}

export interface OptionType {
  value: string;
  label: string;
}
export type UserCredentials = {
  uri: string;
  userName: string;
  password: string;
} & { [key: string]: any };

export type ExtractParams = {
  file?: string;
  model: string;
  source_url?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
} & { [key: string]: any };

export type UploadParams = {
  file: string;
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
