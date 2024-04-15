import { createContext, useState, useContext, FunctionComponent, ReactNode, Dispatch, SetStateAction } from 'react';
import { UserCredentials } from '../types';
import { Driver } from 'neo4j-driver';

type Props = {
  children: ReactNode;
};

interface ContextProps {
  userCredentials: UserCredentials | null;
  setUserCredentials: (UserCredentials: UserCredentials) => void;
  driver: Driver | null;
  setDriver: Dispatch<SetStateAction<Driver | null>>;
}
export const UserConnection = createContext<ContextProps>({
  userCredentials: null,
  setUserCredentials: () => null,
  driver: null,
  setDriver: () => null,
});
export const useCredentials = () => {
  const userCredentials = useContext(UserConnection);
  return userCredentials;
};
const UserCredentialsWrapper: FunctionComponent<Props> = (props) => {
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const value = {
    userCredentials,
    setUserCredentials,
    driver,
    setDriver,
  };
  return <UserConnection.Provider value={value}>{props.children}</UserConnection.Provider>;
};
export default UserCredentialsWrapper;
