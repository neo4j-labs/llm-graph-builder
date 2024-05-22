import './App.css';
import '@neo4j-ndl/base/lib/neo4j-ds-styles.css';
import ThemeWrapper from './context/ThemeWrapper';
import QuickStarter from './components/QuickStarter';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ChatbotPreview from './components/ChatbotPreview';
import { FileContextProvider } from './context/UsersFiles';
import { MessageContextWrapper } from './context/UserMessages';
import UserCredentialsWrapper from './context/UserCredentials';
const App: React.FC = () => {
  return (
    <UserCredentialsWrapper>
      <FileContextProvider>
        <MessageContextWrapper>
          <BrowserRouter>
            <ThemeWrapper>
              <Routes>
                <Route path='/' element={<QuickStarter />} />
                <Route path='/chat-widget-preview' element={<ChatbotPreview />} />
              </Routes>
            </ThemeWrapper>
          </BrowserRouter>
        </MessageContextWrapper>
      </FileContextProvider>
    </UserCredentialsWrapper>
  );
};

export default App;
