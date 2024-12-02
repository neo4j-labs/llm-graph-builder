import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ChatOnlyComponent from './components/ChatBot/ChatOnlyComponent';
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [],
  },
  { path: '/chat-only', element: <ChatOnlyComponent /> },
]);
export default router;
