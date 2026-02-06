import { useTheme } from '../context/ThemeContext';

type Theme = 'light' | 'dark' | 'system';

const themes: { value: Theme; icon: string; label: string }[] = [
  { value: 'light', icon: '☀️', label: 'Light' },
  { value: 'dark', icon: '🌙', label: 'Dark' },
  { value: 'system', icon: '💻', label: 'System' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((t) => t.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];

  return (
    <button
      onClick={cycleTheme}
      className="px-2 py-1 rounded text-xs font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      title={`Theme: ${currentTheme.label} (click to cycle)`}
    >
      {currentTheme.icon}
    </button>
  );
}
