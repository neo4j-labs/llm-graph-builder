import { createContext, useState, useContext } from 'react';

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
export default function UserCredentialsWrapper({ children }) {
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const value = {
    userCredentials,
    setUserCredentials,
  };
  return <UserConnection.Provider value={value}>{children}</UserConnection.Provider>;
}
