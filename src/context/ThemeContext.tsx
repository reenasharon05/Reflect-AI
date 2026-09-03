import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveUserTheme, getUserTheme } from '../lib/firebase';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  syncWithUser: (userId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'gemini_reflect_theme_preference';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const current = getStoredTheme();
    return current === 'system' ? getSystemTheme() : current;
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Apply theme class and color scheme to document element
  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }

    // Update browser theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#151612' : '#F5F5F0');
  }, []);

  // Update resolved theme whenever theme preference or system setting changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolved = () => {
      const activeResolved = theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme;
      setResolvedTheme(activeResolved);
      applyTheme(activeResolved);
    };

    updateResolved();

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const nextResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(nextResolved);
        applyTheme(nextResolved);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme, applyTheme]);

  // Set theme handler with local persistence and optional Firestore sync
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to persist theme to localStorage:', e);
    }

    if (currentUserId) {
      saveUserTheme(currentUserId, newTheme).catch((err) => {
        console.warn('Failed to sync theme to Firestore:', err);
      });
    }
  }, [currentUserId]);

  // Direct toggle between light and dark
  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  // Sync preference with logged in user from Firestore
  const syncWithUser = useCallback(async (userId: string) => {
    setCurrentUserId(userId);
    try {
      const cloudTheme = await getUserTheme(userId);
      if (cloudTheme && (cloudTheme === 'light' || cloudTheme === 'dark' || cloudTheme === 'system')) {
        setThemeState(cloudTheme);
        localStorage.setItem(THEME_STORAGE_KEY, cloudTheme);
      } else {
        // Persist current local preference to cloud profile
        const localTheme = getStoredTheme();
        await saveUserTheme(userId, localTheme);
      }
    } catch (err) {
      console.warn('Error during user theme sync:', err);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        syncWithUser
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
