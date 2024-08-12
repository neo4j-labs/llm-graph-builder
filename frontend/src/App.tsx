import './App.css';
import '@neo4j-ndl/base/lib/neo4j-ds-styles.css';
import ThemeWrapper from './context/ThemeWrapper';
import QuickStarter from './components/QuickStarter';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { APP_SOURCES } from './utils/Constants';
import ErrorBoundary from './components/UI/ErrroBoundary';

const App: React.FC = () => {
  return (
    <>
      {APP_SOURCES != undefined && APP_SOURCES.includes('gcs') ? (
        <ErrorBoundary>
          <GoogleOAuthProvider clientId={process.env.VITE_GOOGLE_CLIENT_ID as string}>
            <ThemeWrapper>
              <QuickStarter />
            </ThemeWrapper>
          </GoogleOAuthProvider>
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <ThemeWrapper>
            <QuickStarter />
          </ThemeWrapper>
        </ErrorBoundary>
      )}
    </>
  );
};

export default App;
