import { createContext, useState, useContext, FunctionComponent, ReactNode } from 'react';
import { alertStateType } from '../types';
import { OverridableStringUnion } from '@mui/types';
import { AlertColor, AlertPropsColorOverrides } from '@mui/material';

type Props = {
  children: ReactNode;
};

interface ContextProps {
  alertState: alertStateType;
  showAlert: (
    alertType: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined,
    alertMessage: string
  ) => void;
  closeAlert: () => void;
}
export const alertContext = createContext<ContextProps>({
  alertState: { showAlert: false, alertMessage: '', alertType: 'info' },
  closeAlert: () => {},
  showAlert: () => {},
});
export const useAlertContext = () => {
  const alertCtx = useContext(alertContext);
  return alertCtx;
};
const AlertContextWrapper: FunctionComponent<Props> = (props) => {
  const [alertState, setAlertState] = useState<alertStateType>({
    showAlert: false,
    alertMessage: '',
    alertType: 'info',
  });
  const showAlert = (
    alertType: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined,
    alertMessage: string
  ) => {
    setAlertState({
      showAlert: true,
      alertType,
      alertMessage,
    });
  };
  const closeAlert = () => {
    setAlertState({
      showAlert: false,
      alertType: 'info',
      alertMessage: '',
    });
  };
  const value = {
    alertState,
    showAlert,
    closeAlert,
  };
  return <alertContext.Provider value={value}>{props.children}</alertContext.Provider>;
};
export default AlertContextWrapper;
