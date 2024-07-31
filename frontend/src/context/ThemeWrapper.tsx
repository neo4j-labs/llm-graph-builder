import { ReactNode, createContext, useMemo, useState } from 'react';
import { NeedleThemeProvider, useMediaQuery } from '@neo4j-ndl/react';

export const ThemeWrapperContext = createContext({
  toggleColorMode: () => {},
  colorMode: localStorage.getItem('mode') as 'light' | 'dark',
});

interface ThemeWrapperProps {
  children: ReactNode;
}
const ThemeWrapper = ({ children }: ThemeWrapperProps) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  // @ts-ignore
  const defaultMode: 'light' | 'dark' = localStorage.getItem('mode');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : defaultMode ?? 'light');
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
    [mode]
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
        {children}
      </NeedleThemeProvider>
    </ThemeWrapperContext.Provider>
  );
};
export default ThemeWrapper;
