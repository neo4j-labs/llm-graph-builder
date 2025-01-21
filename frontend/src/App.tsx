import { Route, Routes } from 'react-router-dom';
import ChatOnlyComponent from './components/ChatBot/ChatOnlyComponent';
import { AuthenticationGuard } from './components/Auth/Auth';
import Home from './Home';
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<AuthenticationGuard component={Home} />}></Route>
      <Route path='/chat-only' element={<ChatOnlyComponent />}></Route>
    </Routes>
  );
};
export default App;
