import { AlertColor, AlertPropsColorOverrides } from '@mui/material';
import { AxiosResponse } from 'axios';
import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import { OverridableStringUnion } from '@mui/types';
import type { Node, Relationship } from '@neo4j-nvl/base';
import { NonOAuthError } from '@react-oauth/google';
import { BannerType } from '@neo4j-ndl/react';
import Queue from './utils/Queue';

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
  checked?: boolean;
  retryOptionStatus: boolean;
  retryOption: string;
}
export interface CustomFile extends CustomFileBase {
  id: string;
}

export interface OptionType {
  readonly value: string;
  readonly label: string;
}

export type UserCredentials = {
  uri: string;
  userName: string;
  password: string;
  database: string;
} & { [key: string]: any };

export interface SourceNode extends Omit<CustomFileBase, 'relationshipCount'> {
  fileName: string;
  fileSize: number;
  fileType: string;
  nodeCount?: number;
  processingTime?: string;
  relationshipCount?: number;
  url?: string;
  awsAccessKeyId?: string;
  uploadprogress?: number;
  gcsProjectId?: string;
  processed_chunk?: number;
  total_chunks?: number;
  retry_condition?: string;
}

export type ExtractParams = Pick<CustomFile, 'wiki_query' | 'model' | 'source_url' | 'language' | 'access_token'> & {
  file?: File;
  aws_access_key_id?: string | null;
  aws_secret_access_key?: string | null;
  max_sources?: number;
  gcs_bucket_name?: string;
  gcs_bucket_folder?: string;
  gcs_blob_filename?: string;
  source_type?: string;
  file_name?: string;
  allowedNodes?: string[];
  allowedRelationship?: string[];
  gcs_project_id?: string;
  retry_condition: string;
} & { [key: string]: any };

export type UploadParams = {
  file: Blob;
  model: string;
  chunkNumber: number;
  totalChunks: number;
  originalname: string;
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
  isLargeDesktop?: boolean;
}

export interface S3ModalProps {
  hideModal: () => void;
  open: boolean;
}
export interface GCSModalProps extends Omit<S3ModalProps, ''> {
  openGCSModal: () => void;
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
  toggles3Modal: () => void;
  toggleGCSModal: () => void;
  toggleGenericModal: () => void;
  setIsleftExpanded?: Dispatch<SetStateAction<boolean>>;
}

export interface DrawerProps {
  isExpanded: boolean;
  shows3Modal: boolean;
  showGCSModal: boolean;
  showGenericModal: boolean;
  toggleS3Modal: () => void;
  toggleGCSModal: () => void;
  toggleGenericModal: () => void;
}

export interface ContentProps {
  isLeftExpanded: boolean;
  isRightExpanded: boolean;
  showChatBot: boolean;
  openChatBot: () => void;
  openTextSchema: () => void;
  isSchema?: boolean;
  setIsSchema: Dispatch<SetStateAction<boolean>>;
  showEnhancementDialog: boolean;
  toggleEnhancementDialog: () => void;
  closeSettingModal: () => void;
}

export interface FileTableProps {
  isExpanded: boolean;
  connectionStatus: boolean;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
  onInspect: (id: string) => void;
  handleGenerateGraph: () => void;
  onRetry: (id: string) => void;
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

export interface CustomInput {
  value: string;
  label: string;
  placeHolder: string;
  onChangeHandler: React.ChangeEventHandler<HTMLInputElement>;
  submitHandler: (url: string) => void;
  disabledCheck: boolean;
  onCloseHandler: () => void;
  id: string;
  onBlurHandler: React.FocusEventHandler<HTMLInputElement>;
  status: 'unknown' | 'success' | 'info' | 'warning' | 'danger';
  setStatus: Dispatch<SetStateAction<'unknown' | 'success' | 'info' | 'warning' | 'danger'>>;
  statusMessage: string;
  isValid: boolean;
  isFocused: boolean;
  onPasteHandler: React.ClipboardEventHandler<HTMLInputElement>;
}

export interface CommonButtonProps {
  openModal: () => void;
  wrapperclassName?: string;
  logo: string;
  title?: string;
  className?: string;
  imgWidth?: number;
  imgeHeight?: number;
}

export interface Source {
  page_numbers?: number[];
  source_name: string;
  start_time?: string;
}
export interface ChunkDetail {
  id: string;
  score: number;
}
export type ResponseMode = {
  message: string;
  sources?: string[];
  model?: string;
  total_tokens?: number;
  response_time?: number;
  cypher_query?: string;
  nodeDetails?: nodeDetailsProps;
  chunk_ids?: string[];
  graphonly_entities?: [];
  error?: string;
  entities?: string[];
};
export interface Messages {
  id: number;
  user: string;
  datetime: string;
  isTyping?: boolean;
  isLoading?: boolean;
  speaking?: boolean;
  copying?: boolean;
  modes: {
    [key: string]: ResponseMode;
  };
  currentMode: string;
}
// {
//   "status": "Success",
//   "data": {
//       "session_id": "d4343658-3f41-4e85-9e64-d54f868c7b3a",
//       "message": "Isaac Newton was an English polymath active as a mathematician, physicist, astronomer, alchemist, theologian, and author. He is best known for his work during the Scientific Revolution and the Enlightenment, particularly for his book \"Philosophiæ Naturalis Principia Mathematica\" (Mathematical Principles of Natural Philosophy), published in 1687. In this work, he formulated the laws of motion and universal gravitation, which became the foundation of classical mechanics. Newton also made significant contributions to optics and shares credit with Gottfried Wilhelm Leibniz for the development of calculus.",
//       "info": {
//           "sources": [
//               "https://en.wikipedia.org/wiki/Isaac_Newton"
//           ],
//           "model": "gpt-4o-2024-08-06",
//           "nodedetails": {
//               "chunkdetails": [
//                   {
//                       "id": "1f739b482f9d0ecdd86a78ef32d7ca91e991da7d",
//                       "score": 0.789
//                   },
//                   {
//                       "id": "7003d7d030b92e61fc1a27d7d7a532c2be382546",
//                       "score": 0.7661
//                   },
//                   {
//                       "id": "fe184a88930357ff73435b03c1746d4fba3c0456",
//                       "score": 0.7631
//                   },
//                   {
//                       "id": "2d15e6bd4865448686afad3cd1d6c009bbd2d0e1",
//                       "score": 0.7598
//                   },
//                   {
//                       "id": "018a5ef078bee39ff5e52ebc237085d2c2ceed65",
//                       "score": 0.7591
//                   },
//                   {
//                       "id": "cdb4193194583a94c861b13d01a8a712651eb804",
//                       "score": 0.7586
//                   },
//                   {
//                       "id": "6f234d54238c930f984f739302d40f30fbb44cc3",
//                       "score": 0.7573
//                   },
//                   {
//                       "id": "2d46e3e966e1b25e97048d6639a2051fcdcd373f",
//                       "score": 0.7554
//                   },
//                   {
//                       "id": "6ef225b7dc7e47c2e2ee19e68760dac5eb278179",
//                       "score": 0.7543
//                   },
//                   {
//                       "id": "70e10055266710d4d5f2a6cf9096529e15a43cec",
//                       "score": 0.7515
//                   }
//               ],
//               "entitydetails": [],
//               "communitydetails": []
//           },
//           "total_tokens": 5051,
//           "response_time": 8.93,
//           "mode": "graph+vector",
//           "entities": {
//               "entityids": [
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:812",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:676",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:848",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:813",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:671",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:775",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:3049",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2388",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:822",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:821",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:774",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2643",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2617",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2622",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2616",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2613",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2605",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2546",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2583",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2567",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:824",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:776",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:946",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:930",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:945",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2638",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:950",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:842",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2121",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:874",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:887",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:853",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:951",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:942",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:941",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:943",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:944",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:790",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2142",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2390",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:905",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2141",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2140",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2139",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2138",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2137",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2136",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:947",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:791",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2587",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:898",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2398",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:949",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:875",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:948",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2637",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:2639",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:940",
//                   "4:265786b5-fc8f-4921-b673-a13079bb7c58:939"
//               ],
//               "relationshipids": [
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730014359814820",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070729980000076624",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070729945640338221",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070728468171588255",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306104452462936839",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306093113749277673",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306093113749277012",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070694795627987766",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070694795627987765",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730598475369043",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730495396153913",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730461036415550",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730461036415544",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730461036415541",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730461036415533",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730461036415474",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730392316938775",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070730186158508551",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305925850542900024",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156084799559959302",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153375602909119276",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153375602909119238",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6917823696757326648",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306050370234745606",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305942205778363142",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153832999746274054",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153787919769535239",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153374503397491500",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153374503397491462",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6917823696757326599",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306072600985469858",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8072929484291965874",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070677684478280626",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070552924268266417",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153049047955669922",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070627313101834830",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306085004851020706",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8072914537805775798",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070662737992090550",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305913790274732874",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6917895165013132214",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070694898707204169",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070593949795878985",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305932104015283063",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6917656570989905993",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306102012921512866",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070696444895429559",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070695173585109943",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306085039210759074",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306058857090122502",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306084901771805602",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070667342197031854",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070609239879451566",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305942171418624930",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305942171418624774",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6920647242617455533",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6918395442803770285",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306084936131543970",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070667342197031855",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070609239879451567",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306093251188228870",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070696410535691184",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070695139225371568",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306078270342300578",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2308216201983035486",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153918761653242198",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6920680227966288777",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156051814211127389",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156051814211127388",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156051814211127387",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156051814211127386",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156051814211127385",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156051814211127384",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306072635345208226",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070669987896886195",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156420150606432795",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1156420150606431106",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1154055101095084844",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6918662624129319703",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153918761653240599",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153784621234651910",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:8070698334681041246",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306084970491282357",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305931897856852855",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6917656570989904759",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153897870932313013",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2306072669704946594",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305925335146824454",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6920543888524444596",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6918292088710759348",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305967494545803853",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6919023263943230380",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:1153047948444042146",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:6919907271291962284",
//                   "5:265786b5-fc8f-4921-b673-a13079bb7c58:2305969624849580971"
//               ]
//           }
//       },
//       "user": "chatbot"
//   }
// }
export type ChatbotProps = {
  messages: Messages[];
  setMessages: Dispatch<SetStateAction<Messages[]>>;
  isLoading: boolean;
  clear?: boolean;
  isFullScreen?: boolean;
  connectionStatus: boolean;
};
export interface WikipediaModalTypes extends Omit<S3ModalProps, ''> {}

export interface GraphViewModalProps {
  open: boolean;
  inspectedName?: string;
  setGraphViewOpen: Dispatch<SetStateAction<boolean>>;
  viewPoint: string;
  nodeValues?: ExtendedNode[];
  relationshipValues?: ExtendedRelationship[];
  selectedRows?: CustomFile[] | undefined;
}

export type GraphType = 'Entities' | 'DocumentChunk' | 'Communities';

export type PartialLabelNode = Partial<Node> & {
  labels: string;
};

export interface CheckboxSectionProps {
  graphType: GraphType[];
  loading: boolean;
  handleChange: (graph: GraphType) => void;
  isgds: boolean;
  isDocChunk: boolean;
  isEntity: boolean;
}

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
export interface BannerAlertProps extends Omit<alertStateType, 'alertType'> {
  alertType: BannerType;
}
export type Scheme = Record<string, string>;

export type LabelCount = Record<string, number>;

export interface LegendChipProps {
  scheme: Scheme;
  label: string;
  type: 'node' | 'relationship' | 'propertyKey';
  count: number;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
}
export interface FileContextProviderProps {
  children: ReactNode;
}
export interface orphanNode {
  id: string;
  elementId: string;
  description: string;
  labels: string[];
  embedding?: null | string;
}
export interface orphanNodeProps {
  documents: string[];
  chunkConnections: number;
  e: orphanNode;
  checked?: boolean;
  similar?: orphanNode[];
}
export interface labelsAndTypes {
  labels: string[];
  relationshipTypes: string[];
}
interface orphanTotalNodes {
  total: number;
}
export interface commonserverresponse {
  status: string;
  error?: string;
  message?: string | orphanTotalNodes;
  file_name?: string;
  data?: labelsAndTypes | labelsAndTypes[] | uploadData | orphanNodeProps[] | dupNodes[];
}
export interface dupNodeProps {
  id: string;
  elementId: string;
  labels: string[];
  embedding?: null | string;
}
export interface dupNodes {
  e: dupNodeProps;
  similar: dupNodeProps[];
  documents: string[];
  chunkConnections: number;
}
export interface selectedDuplicateNodes {
  firstElementId: string;
  similarElementIds: string[];
}
export interface ScehmaFromText extends Partial<commonserverresponse> {
  data: labelsAndTypes;
}

export interface ServerData extends Partial<commonserverresponse> {
  data: labelsAndTypes[];
}
export interface duplicateNodesData extends Partial<commonserverresponse> {
  data: dupNodes[];
}
export interface OrphanNodeResponse extends Partial<commonserverresponse> {
  data: orphanNodeProps[];
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
  sources: string[];
  model: string;
  response_time: number;
  total_tokens: number;
  mode: string;
  cypher_query?: string;
  graphonly_entities: [];
  error: string;
  entities_ids: string[];
  nodeDetails: nodeDetailsProps;
}

export interface eventResponsetypes extends Omit<SourceNode, 'total_chunks' | 'processingTime'> {
  total_chunks: number | null;
  processingTime: number;
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
  node: ExtendedNode[];
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
export type Community = {
  id: string;
  summary: string;
  weight: number;
  level: number;
  community_rank: number;
  score?: number;
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
  score?: string;
  fileType: string;
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

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  openTextSchema: () => void;
  onContinue?: () => void;
  settingView: 'contentView' | 'headerView';
  isSchema?: boolean;
  setIsSchema: Dispatch<SetStateAction<boolean>>;
  onClear?: () => void;
}
export interface Menuitems {
  title: string | JSX.Element;
  onClick: () => void;
  disabledCondition: boolean;
  description?: string | React.ReactNode;
  isSelected?: boolean;
  selectedClassName?: string;
}
export type Vertical = 'top' | 'bottom';
export type Horizontal = 'left' | 'right' | 'center';
export interface Origin {
  vertical: Vertical;
  horizontal: Horizontal;
}

export type BasicNode = {
  id: string;
  labels: string[];
  properties: Record<string, string>;
  propertyTypes: Record<string, string>;
};

export type GraphStatsLabels = Record<
  string,
  {
    count: number;
    properties: Record<string, string>;
  }
>;

export interface ExtendedNode extends Node {
  labels: string[];
  properties: {
    fileName?: string;
    [key: string]: any;
  };
}

export interface ExtendedRelationship extends Relationship {
  count: number;
}
export interface connectionState {
  openPopUp: boolean;
  chunksExists: boolean;
  vectorIndexMisMatch: boolean;
  chunksExistsWithDifferentDimension: boolean;
}
export interface Message {
  type: 'success' | 'info' | 'warning' | 'danger' | 'unknown';
  content: string | React.ReactNode;
}

export interface ConnectionModalProps {
  open: boolean;
  setOpenConnection: Dispatch<SetStateAction<connectionState>>;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
  isVectorIndexMatch: boolean;
  chunksExistsWithoutEmbedding: boolean;
  chunksExistsWithDifferentEmbedding: boolean;
}
export interface ReusableDropdownProps extends DropdownProps {
  options: string[] | OptionType[];
  placeholder?: string;
  defaultValue?: string;
  children?: React.ReactNode;
  view?: 'ContentView' | 'GraphView';
  isDisabled: boolean;
  value?: OptionType;
}
export interface ChildRef {
  getSelectedRows: () => CustomFile[];
}
export interface IconProps {
  closeChatBot: () => void;
  deleteOnClick?: () => void;
  messages: Messages[];
}
export interface S3File {
  fileName: string;
  fileSize: number;
  url: string;
}
export interface GraphViewButtonProps {
  nodeValues?: ExtendedNode[];
  relationshipValues?: ExtendedRelationship[];
}
export interface DrawerChatbotProps {
  isExpanded: boolean;
  clearHistoryData: boolean;
  messages: Messages[];
  connectionStatus: boolean;
}

export interface ContextProps {
  userCredentials: UserCredentials | null;
  setUserCredentials: (UserCredentials: UserCredentials) => void;
  isGdsActive: boolean;
  setGdsActive: Dispatch<SetStateAction<boolean>>;
  isReadOnlyUser: boolean;
  setIsReadOnlyUser: Dispatch<SetStateAction<boolean>>;
  connectionStatus: boolean;
  setConnectionStatus: Dispatch<SetStateAction<boolean>>;
}
export interface MessageContextType {
  messages: Messages[] | [];
  setMessages: Dispatch<SetStateAction<Messages[]>>;
  clearHistoryData: boolean;
  setClearHistoryData: Dispatch<SetStateAction<boolean>>;
}

export interface DatabaseStatusProps {
  isConnected: boolean;
  isGdsActive: boolean;
  uri: string | null;
}

export type SourcesProps = {
  loading: boolean;
  mode: string;
  sources: string[];
  chunks: Chunk[];
};

export type ChunkProps = {
  loading: boolean;
  chunks: Chunk[];
};

export type EntitiesProps = {
  loading: boolean;
  mode: string;
  graphonly_entities: [];
  infoEntities: Entity[];
};

export type CommunitiesProps = {
  loading: boolean;
  communities: Community[];
};

export interface entity {
  id: string;
  score: number;
}

export interface community {
  id: string;
  score: number;
}

export interface nodeDetailsProps {
  chunkdetails?: ChunkDetail[];
  entitydetails?: entity[];
  communitydetails?: community[];
}

export type entityProps = {
  entityids: [];
  relationshipids: [];
};

export interface showTextFromSchemaDialogType {
  triggeredFrom: string;
  show: boolean;
}
export interface FileContextType {
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
  chatModes: string[];
  setchatModes: Dispatch<SetStateAction<string[]>>;
  isSchema: boolean;
  setIsSchema: React.Dispatch<React.SetStateAction<boolean>>;
  showTextFromSchemaDialog: showTextFromSchemaDialogType;
  setShowTextFromSchemaDialog: React.Dispatch<React.SetStateAction<showTextFromSchemaDialogType>>;
  postProcessingTasks: string[];
  setPostProcessingTasks: React.Dispatch<React.SetStateAction<string[]>>;
  queue: Queue;
  setQueue: Dispatch<SetStateAction<Queue>>;
  processedCount: number;
  setProcessedCount: Dispatch<SetStateAction<number>>;
  postProcessingVal: boolean;
  setPostProcessingVal: Dispatch<SetStateAction<boolean>>;
}
export declare type Side = 'top' | 'right' | 'bottom' | 'left';
