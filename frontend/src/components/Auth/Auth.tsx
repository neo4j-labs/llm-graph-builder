import { Button } from '@neo4j-ndl/react';
import { useAuth0 } from '@auth0/auth0-react';

const Auth = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div>
      <Button onClick={() => loginWithRedirect()}>{'Sign in with Auth0'}</Button>
    </div>
  );
};

export default Auth;
