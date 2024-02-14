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

export interface DropdownProps {
  onSelect: (option: OptionType | null | void) => void;
  isDisabled: boolean
}
export interface CustomAlertProps {
  open: boolean;
  handleClose: () => void;
  alertMessage: string;
}
