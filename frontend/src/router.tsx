import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ChatOnlyComponent from './components/ChatBot/ChatOnlyComponent';
import { Auth0Provider } from '@auth0/auth0-react';
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Auth0Provider
        domain={process.env.VITE_AUTH0_DOMAIN as string}
        clientId={process.env.VITE_AUTH0_CLIENT_ID as string}
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <App />
      </Auth0Provider>
    ),
    children: [],
  },
  { path: '/chat-only', element: <ChatOnlyComponent /> },
]);
export default router;
