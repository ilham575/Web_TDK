import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../css/LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [, setLanguage] = useState(i18n.language);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${i18n.language === 'th' ? 'active' : ''}`}
        onClick={() => changeLanguage('th')}
        title="ภาษาไทย"
      >
        🇹🇭 ไทย
      </button>
      <button
        className={`lang-btn ${i18n.language === 'ms' ? 'active' : ''}`}
        onClick={() => changeLanguage('ms')}
        title="Bahasa Melayu"
      >
        🇲🇾 Melayu
      </button>
    </div>
  );
};

export default LanguageSwitcher;
