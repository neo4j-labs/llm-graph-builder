import { createContext, useState, useContext, FunctionComponent, ReactNode, useReducer } from 'react';
import { ContextProps, UserCredentials } from '../types';

type Props = {
  children: ReactNode;
};

export const UserConnection = createContext<ContextProps>({
  userCredentials: null,
  setUserCredentials: () => null,
  isGdsActive: null,
  setGdsActive: () => null,
});
export const useCredentials = () => {
  const userCredentials = useContext(UserConnection);
  return userCredentials;
};
const UserCredentialsWrapper: FunctionComponent<Props> = (props) => {
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [isGdsActive, setGdsActive] = useReducer((s) => !s, false);
  const value = {
    userCredentials,
    setUserCredentials,
    isGdsActive,
    setGdsActive,
  };

  return <UserConnection.Provider value={value}>{props.children}</UserConnection.Provider>;
};
export default UserCredentialsWrapper;
