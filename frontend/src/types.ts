import { AlertColor, AlertPropsColorOverrides } from '@mui/material';
import { AxiosResponse } from 'axios';
import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import { OverridableStringUnion } from '@mui/types';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { NonOAuthError } from '@react-oauth/google';

export interface CustomFileBase extends Partial<globalThis.File> {
  processing: number | string;
  status: string;
  NodesCount: number;
  relationshipCount: number;
  model: string;
  fileSource: string;
  source_url?: string;
  wiki_query?: string;
  gcsBucket?: string;
  gcsBucketFolder?: string;
  errorMessage?: string;
  uploadprogess?: number;
  processingStatus?: boolean;
  google_project_id?: string;
  language?: string;
  processingProgress?: number;
  access_token?: string;
}
export interface CustomFile extends CustomFileBase {
  id: string;
  // total_pages: number | 'N/A';
}

export interface OptionType {
  readonly value: string;
  readonly label: string;
}

export interface OptionTypeForExamples {
  readonly value: string;
  readonly label: string;
}

export type UserCredentials = {
  uri: string;
  userName: string;
  password: string;
  database: string;
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
  file_name?: string;
  allowedNodes?: string[];
  allowedRelationship?: string[];
  gcs_project_id?: string;
  language?: string;
  access_token?: string;
} & { [key: string]: any };

export type UploadParams = {
  file: Blob;
  model: string;
  chunkNumber:number;
  totalChunks:number;
  originalname:string
} & { [key: string]: any };

export type FormDataParams = ExtractParams | UploadParams;

export interface DropdownProps {
  onSelect: (option: OptionType | null | void) => void;
}

export interface CustomAlertProps {
  open: boolean;
  handleClose: () => void;
  alertMessage: string;
  severity?: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined;
}
export interface DataComponentProps {
  openModal: () => void;
}

export interface S3ModalProps {
  hideModal: () => void;
  open: boolean;
}
export interface GCSModalProps {
  hideModal: () => void;
  open: boolean;
  openGCSModal: () => void;
}
export interface ConnectionModalProps {
  open: boolean;
  setOpenConnection: Dispatch<SetStateAction<boolean>>;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
}

export interface SourceNode {
  fileName: string;
  fileSize: number;
  fileType: string;
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
  uploadprogress?: number;
  gcsProjectId?: string;
  language?: string;
  processed_chunk?: number;
  total_chunks?: number;
  // total_pages?: number;
  access_token?: string;
}

export interface SideNavProps {
  isExpanded: boolean;
  position: 'left' | 'right';
  toggleDrawer: () => void;
  deleteOnClick?: () => void;
  setShowDrawerChatbot?: Dispatch<SetStateAction<boolean>>;
  showDrawerChatbot?: boolean;
  setIsRightExpanded?: Dispatch<SetStateAction<boolean>>;
  messages?: Messages[];
  clearHistoryData?: boolean;
}

export interface DrawerProps {
  isExpanded: boolean;
}

export interface ContentProps {
  isLeftExpanded: boolean;
  isRightExpanded: boolean;
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

export interface Source {
  page_numbers?: number[];
  source_name: string;
  start_time?: string;
}
export interface Messages {
  id: number;
  message: string;
  user: string;
  datetime: string;
  isTyping?: boolean;
  sources?: Source[];
  model?: string;
  isLoading?: boolean;
  response_time?: number;
  chunk_ids?: string[];
  total_tokens?: number;
  speaking?: boolean;
  copying?: boolean;
}

export type ChatbotProps = {
  messages: Messages[];
  setMessages: Dispatch<SetStateAction<Messages[]>>;
  isLoading: boolean;
  clear?: boolean;
  isFullScreen?: boolean;
};
export interface WikipediaModalTypes {
  hideModal: () => void;
  open: boolean;
}

export interface GraphViewModalProps {
  open: boolean;
  inspectedName?: string;
  setGraphViewOpen: Dispatch<SetStateAction<boolean>>;
  viewPoint: string;
  nodeValues?: Node[];
  relationshipValues?: Relationship[];
}

export type GraphType = 'document' | 'chunks' | 'entities';

export interface fileName {
  fileName: string;
  fileSize: number;
  url: string;
  gcsBucketName?: string;
  gcsBucketFolder?: string;
  status?: string;
  gcsProjectId: string;
  language?: string;
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
export interface statusAPI {
  status: string;
  message: string;
  file_name?: fileName;
}
export interface statusupdate {
  status: string;
  message: string;
  file_name: fileStatus;
}
export interface fileStatus {
  fileName: string;
  status: string;
  processingTime?: number;
  nodeCount?: number;
  relationshipCount?: number;
  model: string;
  total_chunks?: number;
  // total_pages?: number;
  processed_chunk?: number;
}
export interface PollingAPI_Response extends Partial<AxiosResponse> {
  data: statusupdate;
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
  gcs_project_id?: string;
  access_token?: string;
}
export type alertStateType = {
  showAlert: boolean;
  alertType: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined;
  alertMessage: string;
};

export type Scheme = Record<string, string>;
export type LabelCount = Record<string, number>;
interface NodeType extends Partial<Node> {
  labels?: string[];
}
export interface LegendChipProps {
  scheme: Scheme;
  title: string;
  nodes: NodeType[];
}
export interface FileContextProviderProps {
  children: ReactNode;
}
export interface labelsAndTypes {
  labels: string[];
  relationshipTypes: string[];
}
export interface commonserverresponse {
  status: string;
  error?: string;
  message?: string;
  file_name?: string;
  data?: labelsAndTypes | labelsAndTypes[] | uploadData;
}

export interface ScehmaFromText extends Partial<commonserverresponse> {
  data: labelsAndTypes;
}
export interface ServerData extends Partial<commonserverresponse> {
  data: labelsAndTypes[];
}
export interface schema {
  nodelabels: string[];
  relationshipTypes: string[];
}

export interface SourceListServerData {
  data: SourceNode[];
  status: string;
  error?: string;
  message?: string;
}

export interface chatInfoMessage extends Partial<Messages> {
  sources: Source[];
  model: string;
  response_time: number;
  chunk_ids: string[];
  total_tokens: number;
}

export interface eventResponsetypes {
  fileName: string;
  status: string;
  processingTime: number;
  nodeCount: number;
  relationshipCount: number;
  model: string;
  total_chunks: number | null;
  // total_pages: number;
  fileSize: number;
  processed_chunk?: number;
  fileSource: string;
}
export type Nullable<Type> = Type | null;

export type LabelColors = 'default' | 'success' | 'info' | 'warning' | 'danger' | undefined;

export interface HoverableLinkProps {
  url: string;
  children: React.ReactNode;
}

export interface ChunkEntitiesProps {
  userCredentials: UserCredentials | null;
  chunkIds: string[];
}

export interface CHATINFO_RESPONSE {
  status: string;
  message: string;
  error?: string;
  node: Node[];
  relationships: Relationship[];
  data?: any;
}

export interface ChatInfo_APIResponse extends Partial<AxiosResponse> {
  data: CHATINFO_RESPONSE;
}

export interface nonoautherror extends NonOAuthError {
  message?: string;
}

export type Entity = {
  element_id: string;
  labels: string[];
  properties: {
    id: string;
  };
};

export type GroupedEntity = {
  texts: Set<string>;
  color: string;
};

export interface uploadData {
  file_size: number;
  // total_pages: number;
  file_name: string;
  message: string;
}
export interface UploadResponse extends Partial<commonserverresponse> {
  data: uploadData;
}
export interface LargefilesProps {
  largeFiles: CustomFile[];
  handleToggle: (ischecked: boolean, id: string) => void;
  checked: string[];
}

export interface MessagesContextProviderProps {
  children: ReactNode;
}

export interface Chunk {
  id: string;
  position: number;
  text: string;
  fileName: string;
  length: number;
  embedding: string | null;
  page_number?: number;
  start_time?: string;
  content_offset?: string;
  url?: string;
  fileSource: string;
}

export interface SpeechSynthesisProps {
  onEnd?: () => void;
}

export interface SpeechArgs {
  text?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}
