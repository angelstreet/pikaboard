import { useState, useMemo } from 'react';
import SwipeCard from '../components/SwipeCard';
import FilterSheet from '../components/FilterSheet';
import { mockProfiles, Filters, currentUser, Profile } from '../data/profiles';

// Local storage keys
const MATCHES_KEY = 'pikaboard_matches';
const SWIPED_KEY = 'pikaboard_swiped';

export default function Discover() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    ageMin: 18,
    ageMax: 50,
    distanceMax: 100,
    country: '',
    generation: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [matches, setMatches] = useState<string[]>(() => {
    const stored = localStorage.getItem(MATCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [swiped, setSwiped] = useState<string[]>(() => {
    const stored = localStorage.getItem(SWIPED_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [showMatchPopup, setShowMatchPopup] = useState<Profile | null>(null);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return mockProfiles.filter(p => {
      // Skip current user
      if (p.id === currentUser.id) return false;
      // Skip already swiped
      if (swiped.includes(p.id)) return false;
      // Age filter
      if (p.age < filters.ageMin || p.age > filters.ageMax) return false;
      // Distance filter
      if (p.distance > filters.distanceMax) return false;
      // Country filter
      if (filters.country && p.country !== filters.country) return false;
      // Generation filter
      if (filters.generation.length > 0 && !filters.generation.includes(p.generation)) return false;
      return true;
    });
  }, [filters, swiped]);

  const handleSwipe = (direction: 'left' | 'right') => {
    const profile = filteredProfiles[currentIndex];
    if (!profile) return;

    // Save to swiped
    const newSwiped = [...swiped, profile.id];
    setSwiped(newSwiped);
    localStorage.setItem(SWIPED_KEY, JSON.stringify(newSwiped));

    // Check for match (right swipe = like)
    if (direction === 'right') {
      // Simulate 30% match rate
      if (Math.random() < 0.3) {
        const newMatches = [...matches, profile.id];
        setMatches(newMatches);
        localStorage.setItem(MATCHES_KEY, JSON.stringify(newMatches));
        setShowMatchPopup(profile);
      }
    }

    // Move to next card
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const activeProfile = filteredProfiles[currentIndex];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredProfiles.length - currentIndex} profiles remaining
          </p>
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={`p-3 rounded-xl border transition-colors ${
            filters.generation.length > 0 || filters.country
              ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-yellow-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 relative min-h-[500px]">
        {activeProfile ? (
          <>
            {/* Stack of visible cards */}
            {[0, 1, 2].reverse().map((offset) => {
              const profileIndex = currentIndex + offset;
              const profile = filteredProfiles[profileIndex];
              if (!profile) return null;
              
              const isActive = offset === 0;
              
              return (
                <div
                  key={profile.id}
                  className="absolute inset-0"
                  style={{
                    zIndex: 3 - offset,
                    transform: isActive ? 'none' : `scale(${1 - offset * 0.05}) translateY(${offset * 8}px)`,
                    opacity: offset > 1 ? 0 : 1,
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  <SwipeCard
                    profile={profile}
                    onSwipe={handleSwipe}
                    isActive={isActive}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <span className="text-6xl mb-4">😔</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No more profiles</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              You've seen everyone! Try adjusting your filters.
            </p>
            <button
              onClick={() => {
                setSwiped([]);
                setCurrentIndex(0);
                localStorage.removeItem(SWIPED_KEY);
              }}
              className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors"
            >
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={() => handleSwipe('left')}
          disabled={!activeProfile}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-red-500 text-red-500 flex items-center justify-center text-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipe('right')}
          disabled={!activeProfile}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-green-500 text-green-500 flex items-center justify-center text-2xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ♥
        </button>
      </div>

      {/* Match Popup */}
      {showMatchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMatchPopup(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-scale-up">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">It's a Match!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You and {showMatchPopup.name} liked each other!
            </p>
            <div className="flex gap-4 justify-center mb-6">
              <img
                src={currentUser.image}
                alt="You"
                className="w-20 h-20 rounded-full object-cover border-4 border-yellow-500"
              />
              <img
                src={showMatchPopup.image}
                alt={showMatchPopup.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-yellow-500"
              />
            </div>
            <button
              onClick={() => setShowMatchPopup(null)}
              className="w-full px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors"
            >
              Keep Swiping
            </button>
          </div>
        </div>
      )}

      {/* Filter Sheet */}
      <FilterSheet
        filters={filters}
        onChange={setFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
}
