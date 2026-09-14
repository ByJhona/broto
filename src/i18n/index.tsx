import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import pt from './locales/pt';

export type Language = 'en' | 'pt';

const LANGUAGE_PREFERENCE_KEY = 'broto:language-preference';

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'pt';
}

function detectDeviceLanguage(): Language {
  const languageCode = Localization.getLocales()[0]?.languageCode;
  return languageCode === 'en' ? 'en' : 'pt';
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API is i18n.use(...).init(...)
i18n.use(initReactI18next).init({
  resources: { en, pt },
  lng: detectDeviceLanguage(),
  fallbackLng: 'pt',
  ns: Object.keys(pt),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: Readonly<PropsWithChildren>) {
  const [language, setLanguageState] = useState<Language>(i18n.language as Language);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY).then((stored) => {
      if (isLanguage(stored) && stored !== i18n.language) {
        // eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API is i18n.changeLanguage(...)
        i18n.changeLanguage(stored);
        setLanguageState(stored);
      }
    });
  }, []);

  const persistLanguage = (next: Language) => {
    setLanguageState(next);
    // eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API is i18n.changeLanguage(...)
    i18n.changeLanguage(next);
    AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, next);
  };

  const value = useMemo(() => ({ language, setLanguage: persistLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

export { i18n };
export { useTranslation } from 'react-i18next';
