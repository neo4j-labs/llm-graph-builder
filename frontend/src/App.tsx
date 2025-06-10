import { Route, Routes } from 'react-router-dom';
import ChatOnlyComponent from './components/ChatBot/ChatOnlyComponent';
import { AuthenticationGuard } from './components/Auth/Auth';
import Home from './Home';
import { SKIP_AUTH } from './utils/Constants.ts';

const App = () => {
  return (
    <Routes>
      <Route path='/' element={SKIP_AUTH ? <Home /> : <AuthenticationGuard component={Home} />}></Route>
      <Route path='/readonly' element={<Home />}></Route>
      <Route path='/chat-only' element={<ChatOnlyComponent />}></Route>
    </Routes>
  );
};
export default App;
