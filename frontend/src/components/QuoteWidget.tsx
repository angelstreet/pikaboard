import { useEffect, useState, useCallback, useRef } from 'react';

interface Quote {
  text: string;
  author: string;
  category: string;
}

const QUOTES: Quote[] = [
  // Motivation
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "motivation" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", category: "motivation" },
  { text: "Ship it.", author: "Seth Godin", category: "motivation" },
  { text: "Move fast and break things.", author: "Mark Zuckerberg", category: "motivation" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs", category: "motivation" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", category: "motivation" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "motivation" },
  // Engineering
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", category: "engineering" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", category: "engineering" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", category: "engineering" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", category: "engineering" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs", category: "engineering" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds", category: "engineering" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Hal Abelson", category: "engineering" },
  // Wisdom
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", category: "wisdom" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "wisdom" },
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry", category: "wisdom" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates", category: "wisdom" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", category: "wisdom" },
  // Teamwork
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller", category: "teamwork" },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", author: "African Proverb", category: "teamwork" },
  { text: "Great things in business are never done by one person. They're done by a team of people.", author: "Steve Jobs", category: "teamwork" },
  // Humor
  { text: "There are only two hard things in computer science: cache invalidation and naming things.", author: "Phil Karlton", category: "humor" },
  { text: "It works on my machine.", author: "Every Developer", category: "humor" },
  { text: "99 little bugs in the code, 99 little bugs. Take one down, patch it around, 127 little bugs in the code.", author: "Unknown", category: "humor" },
  // French
  { text: "La simplicité est la sophistication suprême.", author: "Léonard de Vinci", category: "french" },
  { text: "Ce qui se conçoit bien s'énonce clairement.", author: "Nicolas Boileau", category: "french" },
  { text: "Le génie est fait d'un pour cent d'inspiration et de quatre-vingt-dix-neuf pour cent de transpiration.", author: "Thomas Edison", category: "french" },
  { text: "L'imagination est plus importante que le savoir.", author: "Albert Einstein", category: "french" },
];

function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/** Check if quotes are enabled via localStorage (default: false) */
function isQuotesEnabled(): boolean {
  try {
    // Disabled on mobile
    if (window.innerWidth < 768) return false;
    const val = localStorage.getItem('pikaboard_quotes_enabled');
    // Default: disabled. Must explicitly set to 'true' to enable.
    return val === 'true';
  } catch { return false; }
}

function getQuotesDuration(): number {
  try {
    const val = parseInt(localStorage.getItem('pikaboard_quotes_duration') || '8', 10);
    return isNaN(val) ? 8 : val;
  } catch { return 8; }
}

function getQuotesFrequency(): number {
  try {
    const val = parseInt(localStorage.getItem('pikaboard_quotes_frequency') || '45', 10);
    return isNaN(val) ? 45 : val;
  } catch { return 45; }
}

type QuoteFontSize = 'small' | 'medium' | 'large';

function getQuotesFontSize(): QuoteFontSize {
  try {
    const val = localStorage.getItem('pikaboard_quotes_font_size');
    if (val === 'medium' || val === 'large' || val === 'small') return val;
    return 'small';
  } catch { return 'small'; }
}

// Module-level singleton guard: only one QuoteWidget instance can own timers
let activeInstanceId = 0;

export function QuoteWidget() {
  const [quote, setQuote] = useState<Quote>(getRandomQuote);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [enabled, setEnabled] = useState(isQuotesEnabled);
  const [fontSize, setFontSize] = useState<QuoteFontSize>(getQuotesFontSize);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceIdRef = useRef(0);

  // Re-check enabled state when settings change (custom event from Settings page)
  useEffect(() => {
    const onSettingsChanged = () => {
      setEnabled(isQuotesEnabled());
      setFontSize(getQuotesFontSize());
    };
    window.addEventListener('quotes-settings-changed', onSettingsChanged);
    return () => window.removeEventListener('quotes-settings-changed', onSettingsChanged);
  }, []);

  const hide = useCallback(() => {
    setExiting(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 400);
  }, []);

  const visibleRef = useRef(false);
  const busyRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  const showNewQuote = useCallback(() => {
    if (!isQuotesEnabled()) return;
    if (busyRef.current) return;
    busyRef.current = true;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    const reveal = () => {
      const q = getRandomQuote();
      setQuote(q);
      setExiting(false);
      setVisible(true);
      const duration = getQuotesDuration() * 1000;
      hideTimerRef.current = setTimeout(() => {
        hide();
        busyRef.current = false;
      }, duration);
    };

    if (visibleRef.current) {
      // Fade out current quote first
      setExiting(true);
      exitTimerRef.current = setTimeout(() => {
        setVisible(false);
        setExiting(false);
        setTimeout(reveal, 100);
      }, 400);
    } else {
      setTimeout(reveal, 50);
    }
  }, [hide]);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    // Claim singleton ownership — previous instance's timers become no-ops
    const myId = ++activeInstanceId;
    instanceIdRef.current = myId;

    const guardedShowNewQuote = () => {
      // Only the active instance may show quotes
      if (activeInstanceId !== myId) return;
      showNewQuote();
    };

    const frequency = getQuotesFrequency() * 1000;
    // Show first quote quickly when enabled
    const initialTimer = setTimeout(guardedShowNewQuote, 2000);
    const recurring = setInterval(guardedShowNewQuote, frequency);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurring);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [showNewQuote, enabled]);

  if (!enabled || !visible) return null;

  const quoteTextClass =
    fontSize === 'large'
      ? 'text-[22px]'
      : fontSize === 'medium'
        ? 'text-[18px]'
        : 'text-[14px]';
  const authorTextClass =
    fontSize === 'large'
      ? 'text-xs'
      : fontSize === 'medium'
        ? 'text-[11px]'
        : 'text-[10px]';

  return (
    <div
      className={`
        fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-sm sm:max-w-md
        bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm
        border border-white
        rounded-lg shadow-md px-3 py-2
        transition-all duration-400 ease-out
        ${exiting ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}
      `}
    >
      <button
        onClick={hide}
        className="absolute top-0.5 right-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
      <p className={`${quoteTextClass} text-gray-700 dark:text-gray-300 italic leading-relaxed pr-3`}>
        "{quote.text.split(/(?<=\.)\s+/).map((sentence, i, arr) => (
          <span key={i}>
            {sentence}{i < arr.length - 1 && <br />}
          </span>
        ))}"
      </p>
      <p className={`${authorTextClass} text-purple-600 dark:text-purple-400 mt-1 text-right`}>
        — {quote.author}
      </p>
    </div>
  );
}
