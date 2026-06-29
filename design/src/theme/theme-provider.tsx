import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Theme = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('asterism.theme') as Theme | null) ?? 'system';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('asterism.theme') ?? 'system') === 'dark' ||
    ((localStorage.getItem('asterism.theme') ?? 'system') === 'system' && systemPrefersDark())
      ? 'dark'
      : 'light',
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('asterism.theme', t);
  }, []);

  useEffect(() => {
    function apply() {
      const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
      document.documentElement.classList.toggle('dark', isDark);
      setResolved(isDark ? 'dark' : 'light');
    }
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
