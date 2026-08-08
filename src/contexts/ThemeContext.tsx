// contexts/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<
  ThemeContextType | undefined
>(undefined);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize safely: if `window` not available (SSR), fallback to 'light'.
  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "light";

    try {
      const saved = localStorage.getItem("app-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {
      // ignore localStorage errors
    }

    // fallback to system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  };

  const [theme, setThemeState] =
    useState<Theme>(getInitialTheme);

  // Keep <html> class and localStorage in sync
  useEffect(() => {
    try {
      localStorage.setItem("app-theme", theme);
    } catch (e) {
      // ignore
    }

    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
      // optionally remove a custom data-theme attribute if you used it elsewhere
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    }
  }, [theme]);

  const toggleTheme = () =>
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    throw new Error(
      "useTheme must be used inside ThemeProvider",
    );
  return ctx;
}