import { createContext, useState, useContext, FunctionComponent, ReactNode, useEffect } from 'react';
import { ContextProps, UserCredentials } from '../types';
import { useLocation } from 'react-router';

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
  isReadOnlyUser: false,
  setIsReadOnlyUser: () => null,
  isBackendConnected: false,
  setIsBackendConnected: () => null,
  errorMessage: '',
  setErrorMessage: () => null,
  showDisconnectButton: false,
  setShowDisconnectButton: () => null,
  isGCSActive: false,
  setIsGCSActive: () => null,
  //  chunksToBeProces: 50,
  // setChunksToBeProces: () => null,
});
export const useCredentials = () => {
  const userCredentials = useContext(UserConnection);
  return userCredentials;
};
const UserCredentialsWrapper: FunctionComponent<Props> = (props) => {
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [isGdsActive, setGdsActive] = useState<boolean>(false);
  const [isReadOnlyUser, setIsReadOnlyUser] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDisconnectButton, setShowDisconnectButton] = useState<boolean>(false);
  const [isGCSActive, setIsGCSActive] = useState<boolean>(false);
  // const [chunksToBeProces, setChunksToBeProces] = useState<number>(50);
  const value = {
    userCredentials,
    setUserCredentials,
    isGdsActive,
    setGdsActive,
    connectionStatus,
    setConnectionStatus,
    isReadOnlyUser,
    setIsReadOnlyUser,
    isBackendConnected,
    setIsBackendConnected,
    errorMessage,
    setErrorMessage,
    showDisconnectButton,
    setShowDisconnectButton,
    isGCSActive,
    setIsGCSActive,
    // chunksToBeProces,
    // setChunksToBeProces,
  };
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === '/readonly') {
      setIsReadOnlyUser(true);
      localStorage.setItem('isReadOnlyMode', 'true');
    }
  }, [pathname]);
  return <UserConnection.Provider value={value}>{props.children}</UserConnection.Provider>;
};
export default UserCredentialsWrapper;
