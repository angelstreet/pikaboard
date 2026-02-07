import { useEffect, useState, useCallback } from 'react';

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

export function QuoteWidget({ interval = 45000 }: { interval?: number }) {
  const [quote, setQuote] = useState<Quote>(getRandomQuote);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const showNewQuote = useCallback(() => {
    setQuote(getRandomQuote());
    setVisible(true);
    // Auto-hide after 8 seconds
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, 500);
    }, 8000);
  }, []);

  useEffect(() => {
    // Show first quote after 10 seconds
    const initialTimer = setTimeout(showNewQuote, 10000);
    // Then show every `interval` ms
    const recurring = setInterval(showNewQuote, interval);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurring);
    };
  }, [interval, showNewQuote]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-xs sm:max-w-sm
        bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-lg px-4 py-3
        transition-all duration-500 ease-out
        ${exiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
        animate-slide-up
      `}
    >
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => { setVisible(false); setExiting(false); }, 300);
        }}
        className="absolute top-1 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
        aria-label="Dismiss"
      >
        ×
      </button>
      <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed pr-4">
        "{quote.text}"
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-right">
        — {quote.author}
      </p>
    </div>
  );
}
