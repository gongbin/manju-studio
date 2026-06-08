import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
type Accent = 'orange' | 'violet' | 'blue' | 'teal';
type Density = 'compact' | 'regular' | 'comfy';

interface ThemeState {
  theme: Theme; accent: Accent; density: Density;
  setTheme: (t: Theme) => void; setAccent: (a: Accent) => void; setDensity: (d: Density) => void;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeState | null>(null);
export const useTheme = () => {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme outside provider');
  return v;
};

const read = <T,>(k: string, fallback: T): T => (localStorage.getItem(k) as T) || fallback;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => read('ms.theme', 'dark'));
  const [accent, setAccent] = useState<Accent>(() => read('ms.accent', 'orange'));
  const [density, setDensity] = useState<Density>(() => read('ms.density', 'regular'));

  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', theme);
    r.setAttribute('data-accent', accent);
    r.setAttribute('data-density', density);
    localStorage.setItem('ms.theme', theme);
    localStorage.setItem('ms.accent', accent);
    localStorage.setItem('ms.density', density);
  }, [theme, accent, density]);

  const value: ThemeState = {
    theme, accent, density, setTheme, setAccent, setDensity,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
