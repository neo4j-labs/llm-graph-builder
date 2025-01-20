import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ChatOnlyComponent from './components/ChatBot/ChatOnlyComponent';
import Auth0ProviderWithHistory from './components/Auth/Auth';
import { withAuthenticationRequired } from '@auth0/auth0-react';
import React from 'react';
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Auth0ProviderWithHistory>
        <App />
      </Auth0ProviderWithHistory>
    ),
    children: [],
  },
  { path: '/chat-only', element: <ChatOnlyComponent /> },
]);
export default router;
const ProtectedRoute = (component: React.ComponentType<object>) => {
  const Component = withAuthenticationRequired(component);
  return <Component />;
};
