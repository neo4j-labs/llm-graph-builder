import { ReactNode, createContext, useMemo, useState, useEffect } from 'react';
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
  const defaultMode = localStorage.getItem('mode') as 'light' | 'dark';
  const [mode, setMode] = useState<'light' | 'dark'>(defaultMode ?? (prefersDarkMode ? 'dark' : 'light'));
  const [usingPreferredMode, setUsingPreferredMode] = useState<boolean>(!defaultMode);

  useEffect(() => {
    // Ensure the body class is updated on initial load
    themeBodyInjection(mode);
  }, [mode]);
  const themeWrapperUtils = useMemo(
    () => ({
      colorMode: mode,
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          setUsingPreferredMode(false);
          localStorage.setItem('mode', newMode);
          themeBodyInjection(newMode);
          return newMode;
        });
      },
    }),
    [mode]
  );
  const themeBodyInjection = (mode: string) => {
    if (mode === 'dark') {
      document.body.classList.add('ndl-theme-dark');
    } else {
      document.body.classList.remove('ndl-theme-dark');
    }
  };

  if (usingPreferredMode) {
    prefersDarkMode ? themeBodyInjection('dark') : themeBodyInjection('light');
  }
  return (
    <ThemeWrapperContext.Provider value={themeWrapperUtils}>
      <NeedleThemeProvider theme={mode as 'light' | 'dark' | undefined} wrapperProps={{ isWrappingChildren: false }}>
        {children}
      </NeedleThemeProvider>
    </ThemeWrapperContext.Provider>
  );
};
export default ThemeWrapper;
