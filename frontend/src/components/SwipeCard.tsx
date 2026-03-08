import { useState, useRef, useEffect } from 'react';

interface SwipeCardProps {
  profile: {
    id: string;
    name: string;
    age: number;
    bio: string;
    image: string;
    generation: number;
    country: string;
    distance: number;
    interests: string[];
  };
  onSwipe: (direction: 'left' | 'right') => void;
  isActive: boolean;
}

export default function SwipeCard({ profile, onSwipe, isActive }: SwipeCardProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Spring animation using CSS
  const getTransform = () => {
    if (!isActive) return 'translate(0, 0) rotate(0deg)';
    const rotate = offset.x * 0.05;
    return `translate(${offset.x}px, ${offset.y}px) rotate(${rotate}deg)`;
  };

  const getOpacity = () => {
    if (!isActive) return 1;
    const progress = Math.min(Math.abs(offset.x) / 150, 1);
    if (offset.x > 50) return progress;
    if (offset.x < -50) return progress;
    return 1;
  };

  const getLikeOpacity = () => {
    if (!isActive || offset.x <= 0) return 0;
    return Math.min(offset.x / 100, 1);
  };

  const getNopeOpacity = () => {
    if (!isActive || offset.x >= 0) return 0;
    return Math.min(-offset.x / 100, 1);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isActive) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDragging || !isActive) return;
    setIsDragging(false);

    const threshold = 100;
    if (offset.x > threshold) {
      onSwipe('right');
    } else if (offset.x < -threshold) {
      onSwipe('left');
    } else {
      // Spring back
      setOffset({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, offset]);

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 w-full h-full cursor-grab ${!isActive ? 'pointer-events-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      style={{ touchAction: 'none' }}
    >
      {/* Card */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        style={{
          transform: getTransform(),
          opacity: getOpacity(),
          transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
        }}
      >
        {/* Image */}
        <div className="relative w-full h-[65%] bg-gray-100 dark:bg-gray-700">
          <img
            src={profile.image}
            alt={profile.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          
          {/* Like/Nope badges */}
          <div 
            className="absolute top-6 left-6 px-4 py-2 border-4 rounded-lg font-bold text-2xl transform -rotate-12"
            style={{ 
              opacity: getLikeOpacity(),
              borderColor: '#22c55e',
              color: '#22c55e',
              transition: 'opacity 0.2s',
            }}
          >
            LIKE
          </div>
          <div 
            className="absolute top-6 right-6 px-4 py-2 border-4 rounded-lg font-bold text-2xl transform rotate-12"
            style={{ 
              opacity: getNopeOpacity(),
              borderColor: '#ef4444',
              color: '#ef4444',
              transition: 'opacity 0.2s',
            }}
          >
            NOPE
          </div>

          {/* Generation badge */}
          <div className="absolute top-4 left-4 px-2 py-1 bg-yellow-500/90 text-white text-xs font-bold rounded-full">
            Gen {profile.generation}
          </div>

          {/* Distance badge */}
          <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <span>📍</span>
            {profile.distance === 0 ? 'You' : `${profile.distance}km`}
          </div>

          {/* Name & Age */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-3xl font-bold text-white mb-1">
              {profile.name}, {profile.age}
            </h2>
            <p className="text-white/80 text-sm line-clamp-2">{profile.bio}</p>
          </div>
        </div>

        {/* Info section */}
        <div className="p-4">
          {/* Interests */}
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.interests.map((interest, i) => (
              <span 
                key={i}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>

          {/* Country */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>🌍</span>
            <span className="font-medium">{profile.country}</span>
          </div>
        </div>
      </div>

      {/* Swipe hints */}
      {isActive && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
          <div className="flex items-center gap-2 text-red-500">
            <span className="text-2xl">⬅️</span>
            <span className="text-sm font-medium">Nope</span>
          </div>
          <div className="flex items-center gap-2 text-green-500">
            <span className="text-sm font-medium">Like</span>
            <span className="text-2xl">➡️</span>
          </div>
        </div>
      )}
    </div>
  );
}
