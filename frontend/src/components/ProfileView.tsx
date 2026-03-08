import { useState } from 'react';
import { Profile } from '../data/profiles';

interface ProfileViewProps {
  profile: Profile;
  isCurrentUser?: boolean;
  onEdit?: (profile: Profile) => void;
  onClose: () => void;
}

export default function ProfileView({ profile, isCurrentUser, onEdit, onClose }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  const handleSave = () => {
    onEdit?.(editedProfile);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Profile Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <span className="text-xl">✕</span>
        </button>

        {/* Image */}
        <div className="relative h-72 bg-gray-100 dark:bg-gray-700">
          <img
            src={profile.image}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-3xl font-bold text-white">
              {profile.name}, {profile.age}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-2 py-0.5 bg-yellow-500/90 text-white text-xs font-bold rounded-full">
                Gen {profile.generation}
              </span>
              <span className="text-white/80 text-sm">📍 {profile.distance === 0 ? 'You' : `${profile.distance}km away`}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Bio</label>
                <textarea
                  value={editedProfile.bio}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Interests (comma-separated)</label>
                <input
                  type="text"
                  value={editedProfile.interests.join(', ')}
                  onChange={(e) => setEditedProfile({ ...editedProfile, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Bio */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">About</h3>
                <p className="text-gray-900 dark:text-white">{profile.bio}</p>
              </div>

              {/* Interests */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Country</span>
                  <span className="font-semibold text-gray-900 dark:text-white">🌍 {profile.country}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Generation</span>
                  <span className="font-semibold text-gray-900 dark:text-white">🎮 Gen {profile.generation}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {isCurrentUser && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-4 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scale-up {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
