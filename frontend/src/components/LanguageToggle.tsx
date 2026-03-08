import { useLanguage } from '../i18n';

export default function LanguageToggle({ variant = 'default' }: { variant?: 'default' | 'inline' }) {
  const { language, setLanguage } = useLanguage();

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            language === 'en'
              ? 'bg-pika-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          🇬🇧 EN
        </button>
        <button
          onClick={() => setLanguage('fr')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            language === 'fr'
              ? 'bg-pika-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          🇫🇷 FR
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          language === 'en'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="English"
      >
        🇬🇧 EN
      </button>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          language === 'fr'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Français"
      >
        🇫🇷 FR
      </button>
    </div>
  );
}
