import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const languages = [
    { code: 'th', label: 'ไทย', flag: '🇹🇭' },
    { code: 'ms', label: 'Melayu', flag: '🇲🇾' }
  ];

  return (
    <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200 shadow-inner">
      <div className="hidden sm:block px-2 text-slate-400">
        <Languages className="w-3.5 h-3.5" />
      </div>
      <div className="flex gap-1">
        {languages.map((lang) => {
          const isActive = i18n.language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                isActive 
                  ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span>{lang.flag}</span>
              <span className="hidden xs:inline">{lang.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;

