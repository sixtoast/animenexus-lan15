"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyThemeToDocument,
  readTheme,
  writeTheme,
  type ThemeMode,
} from "@/lib/theme";

type Ctx = {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (m: ThemeMode) => void;
  ready: boolean;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = readTheme();
    setThemeState(t);
    applyThemeToDocument(t);
    setReady(true);
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    setThemeState(m);
    writeTheme(m);
    applyThemeToDocument(m);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme, ready }),
    [theme, toggleTheme, setTheme, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
