import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your dictionaries
import enLang from './locales/en.json';
import viLang from './locales/vi.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enLang },
      vi: { translation: viLang }
    },
    lng: 'en', // Default language when the app loads
    fallbackLng: 'en', // If a translation is missing, use English
    interpolation: {
      escapeValue: false // React already protects from XSS attacks
    }
  });

export default i18n;