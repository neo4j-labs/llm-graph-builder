import { createContext, useState, useContext, FunctionComponent, ReactNode, useReducer } from 'react';
import { ContextProps, UserCredentials } from '../types';

type Props = {
  children: ReactNode;
};

export const UserConnection = createContext<ContextProps>({
  userCredentials: null,
  setUserCredentials: () => null,
  isGdsActive: false,
  setGdsActive: () => false,
  connectionStatus: false,
  setConnectionStatus: () => null,
});
export const useCredentials = () => {
  const userCredentials = useContext(UserConnection);
  return userCredentials;
};
const UserCredentialsWrapper: FunctionComponent<Props> = (props) => {
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [isGdsActive, setGdsActive] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useReducer((state) => !state, false);
  const value = {
    userCredentials,
    setUserCredentials,
    isGdsActive,
    setGdsActive,
    connectionStatus,
    setConnectionStatus,
  };

  return <UserConnection.Provider value={value}>{props.children}</UserConnection.Provider>;
};
export default UserCredentialsWrapper;
