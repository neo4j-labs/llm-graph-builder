import Header from './Layout/Header';
import Content from './Content';
import React, { useState } from 'react';
import { ThemeWrapperContext } from '../context/ThemeWrapper';

export default function QuickStarter() {
  const themeUtils = React.useContext(ThemeWrapperContext);
  const [themeMode, setThemeMode] = useState<string>(themeUtils.colorMode);

  const toggleColorMode = () => {
    setThemeMode((prevThemeMode) => {
      return prevThemeMode === 'light' ? 'dark' : 'light';
    });
    themeUtils.toggleColorMode();
  };

  return (
    <div>
      <Header themeMode={themeMode} toggleTheme={toggleColorMode} />
      <Content />
    </div>
  );
}
