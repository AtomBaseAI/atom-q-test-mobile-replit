import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  theme: typeof Colors.light | typeof Colors.dark;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  async function loadThemePreference() {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "auto") {
        setThemeModeState(stored);
      }
    } catch (error) {
      console.error("Failed to load theme preference:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function setThemeMode(mode: ThemeMode) {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }

  function toggleTheme() {
    if (themeMode === "light") {
      setThemeMode("dark");
    } else if (themeMode === "dark") {
      setThemeMode("light");
    } else {
      const isDarkSystem = systemColorScheme === "dark";
      setThemeMode(isDarkSystem ? "light" : "dark");
    }
  }

  const isDark = useMemo(() => {
    if (themeMode === "auto") {
      return systemColorScheme === "dark";
    }
    return themeMode === "dark";
  }, [themeMode, systemColorScheme]);

  const theme = isDark ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({
      theme,
      isDark,
      themeMode,
      setThemeMode,
      toggleTheme,
    }),
    [theme, isDark, themeMode]
  );

  if (isLoading) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
