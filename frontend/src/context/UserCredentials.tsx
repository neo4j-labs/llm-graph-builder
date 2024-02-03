import { createContext, useState, useContext, FunctionComponent, ReactNode } from 'react';
type Props = {
  children: ReactNode;
};
type UserCredentials = {
  uri: string;
  userName: string;
  password: string;
};
interface ContextProps {
  readonly userCredentials: UserCredentials | null;
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
