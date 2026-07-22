import React, { useEffect } from 'react';
import { AppState, Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';
import { LoadingSpinner } from '@neo4j-ndl/react';
import { setAuthTokenGetter } from '../../API/Index';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

// Bridges the Auth0 hook out of React so the axios interceptor can attach the bearer token
const AuthTokenBridge: React.FC = () => {
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  useEffect(() => {
    if (isAuthenticated) {
      setAuthTokenGetter(async (forceRefresh?: boolean) => {
        try {
          return await getAccessTokenSilently(forceRefresh ? { cacheMode: 'off' } : undefined);
        } catch (error) {
          // No refresh token cached for this session (e.g. it predates useRefreshTokens
          // being enabled) - force a full login redirect to mint a new one, rather than
          // silently sending unauthenticated requests.
          if ((error as { error?: string })?.error === 'missing_refresh_token') {
            await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
          }
          throw error;
        }
      });
    } else {
      setAuthTokenGetter(null);
    }
  }, [isAuthenticated, getAccessTokenSilently, loginWithRedirect]);
  return null;
};

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
        scope: 'openid profile email',
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation='localstorage'
      useRefreshTokens={true}
    >
      <AuthTokenBridge />
      {children}
    </Auth0Provider>
  );
};

export const AuthenticationGuard: React.FC<{ component: React.ComponentType<object> }> = ({ component }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  const Component = component;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem('isReadOnlyMode', 'true');
      navigate('/readonly', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);
  // Wait for Auth0 to restore the session (refresh/new tab) before mounting the app,
  // so no API call fires without a bearer token and startup effects run exactly once.
  if (isLoading) {
    return (
      <div className='flex items-center justify-center' style={{ height: '100vh' }}>
        <LoadingSpinner size='large' />
      </div>
    );
  }
  return <Component />;
};

export default Auth0ProviderWithHistory;
