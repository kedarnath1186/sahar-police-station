import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import hi from './locales/hi/translation.json'
import mr from './locales/mr/translation.json'

const savedLanguage = typeof window === 'undefined' ? null : window.localStorage.getItem('language')

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      mr: { translation: mr },
      hi: { translation: hi },
    },
    lng: savedLanguage && ['en', 'mr', 'hi'].includes(savedLanguage) ? savedLanguage : 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'mr', 'hi'],
    interpolation: { escapeValue: false },
    returnNull: false,
  })

export default i18n
