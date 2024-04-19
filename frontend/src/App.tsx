import './App.css';
import '@neo4j-ndl/base/lib/neo4j-ds-styles.css';
import ThemeWrapper from './context/ThemeWrapper';
import QuickStarter from './components/QuickStarter';
const App: React.FC = () => {
  return (
    <ThemeWrapper>
      <QuickStarter />
    </ThemeWrapper>
  );
};

export default App;
