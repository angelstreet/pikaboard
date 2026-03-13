import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en, type Translations } from './en';
import { fr } from './fr';

type Language = 'en' | 'fr';

const translations: Record<Language, Translations> = { en, fr };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'pikaboard_language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'fr') return stored;
    } catch {
      // localStorage not available
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage not available
    }
  };

  const t = translations[language];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback to English if used outside provider
    return { language: 'en' as Language, setLanguage: () => {}, t: en };
  }
  return context;
}

export function useLanguage() {
  const { language, setLanguage } = useI18n();
  return { language, setLanguage };
}
