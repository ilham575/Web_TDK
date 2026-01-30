import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import thTranslation from './locales/th/translation.json';
import msTranslation from './locales/ms/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      th: {
        translation: thTranslation
      },
      ms: {
        translation: msTranslation
      }
    },
    lng: localStorage.getItem('language') || 'th', // ภาษาเริ่มต้น
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
