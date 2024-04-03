import { createContext, useState, useContext, FunctionComponent, ReactNode } from 'react';
import { UserCredentials } from '../types';

type Props = {
  children: ReactNode;
};

interface ContextProps {
  userCredentials: UserCredentials | null;
  setUserCredentials: (UserCredentials: UserCredentials) => void;
}
export const UserConnection = createContext<ContextProps>({
  userCredentials: null,
  setUserCredentials: () => null,
});
export const useCredentials = () => {
  const userCredentials = useContext(UserConnection);
  return userCredentials;
};
const UserCredentialsWrapper: FunctionComponent<Props> = (props) => {
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const value = {
    userCredentials,
    setUserCredentials,
  };
  return <UserConnection.Provider value={value}>{props.children}</UserConnection.Provider>;
};
export default UserCredentialsWrapper;
