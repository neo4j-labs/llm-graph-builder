import React, { useEffect } from 'react';
import { AppState, Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';
import { setAuthTokenProvider } from '../../API/Index';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const Auth0ProviderWithHistory: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  function onRedirectCallback(appState?: AppState) {
    localStorage.removeItem('isReadOnlyMode');
    navigate(appState?.returnTo || window.location.pathname, { state: appState });
  }

  return (
    <Auth0Provider
      domain={domain as string}
      clientId={clientId as string}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};

export const AuthenticationGuard: React.FC<{ component: React.ComponentType<object> }> = ({ component }) => {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const Component = component;
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      setAuthTokenProvider(async () => {
        const token = await getAccessTokenSilently({
          authorizationParams: audience ? { audience } : undefined,
        });
        return token || null;
      });
    } else {
      setAuthTokenProvider(null);
    }

    return () => {
      setAuthTokenProvider(null);
    };
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem('isReadOnlyMode', 'true');
      navigate('/readonly', { replace: true });
    }
  }, [isLoading, isAuthenticated]);
  return <Component />;
};

export default Auth0ProviderWithHistory;
