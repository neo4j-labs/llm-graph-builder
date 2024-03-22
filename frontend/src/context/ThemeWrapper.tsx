import React, { createContext, useMemo, useState } from 'react';
import { NeedleThemeProvider, useMediaQuery } from '@neo4j-ndl/react';
import QuickStarter from '../components/QuickStarter';

export const ThemeWrapperContext = createContext({
  toggleColorMode: () => {},
  colorMode: localStorage.getItem('mode') as string,
});

const ThemeWrapper: React.FunctionComponent = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<string>(prefersDarkMode ? 'dark' : localStorage.getItem('mode') ?? 'light');
  const [usingPreferredMode, setUsingPreferredMode] = useState<boolean>(true);
  const themeWrapperUtils = useMemo(
    () => ({
      colorMode: mode,
      toggleColorMode: () => {
        setMode((prevMode) => {
          setUsingPreferredMode(false);
          localStorage.setItem('mode', prevMode === 'light' ? 'dark' : 'light');
          themeBodyInjection(prevMode);
          return prevMode === 'light' ? 'dark' : 'light';
        });
      },
    }),
    []
  );
  const themeBodyInjection = (mode: string) => {
    if (mode === 'light') {
      document.body.classList.add('ndl-theme-dark');
    } else {
      document.body.classList.remove('ndl-theme-dark');
    }
  };

  if (usingPreferredMode) {
    prefersDarkMode ? themeBodyInjection('light') : themeBodyInjection('dark');
  }

  return (
    <ThemeWrapperContext.Provider value={themeWrapperUtils}>
      <NeedleThemeProvider theme={mode as 'light' | 'dark' | undefined} wrapperProps={{ isWrappingChildren: true }}>
        <QuickStarter />
      </NeedleThemeProvider>
    </ThemeWrapperContext.Provider>
  );
};
export default ThemeWrapper;
