import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import Auth0ProviderWithHistory from './components/Auth/Auth.tsx';
import App from './App.tsx';
import { SKIP_AUTH } from './utils/Constants.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    {SKIP_AUTH ? (
      <App />
    ) : (
      <Auth0ProviderWithHistory>
        <App />
      </Auth0ProviderWithHistory>
    )}
  </BrowserRouter>
);
