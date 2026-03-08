import { useState, useEffect } from 'react';
import { currentUser, Profile } from '../data/profiles';

const PROFILE_KEY = 'pikaboard_profile';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load profile from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      setProfile(JSON.parse(stored));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setProfile(currentUser);
    localStorage.removeItem(PROFILE_KEY);
  };

  const stats = {
    matches: (() => {
      const matches = localStorage.getItem('pikaboard_matches');
      return matches ? JSON.parse(matches).length : 0;
    })(),
    swipes: (() => {
      const swiped = localStorage.getItem('pikaboard_swiped');
      return swiped ? JSON.parse(swiped).length : 0;
    })(),
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your dating profile</p>
        </div>
        {saved && (
          <span className="px-3 py-1 bg-green-500/20 text-green-500 text-sm font-medium rounded-full animate-fade-in">
            ✓ Saved!
          </span>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        {/* Cover Image */}
        <div className="relative h-40 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Avatar */}
        <div className="relative px-6 pb-6">
          <div className="absolute -top-16">
            <div className="relative">
              <img
                src={profile.image}
                alt={profile.name}
                className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
              />
              {isEditing && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setProfile({ ...profile, image: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <span className="text-sm">📷</span>
                </label>
              )}
            </div>
          </div>
          <div className="pt-16 flex justify-end">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pb-6 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Age</label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 18 })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Country</label>
                <select
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="US">🇺🇸 United States</option>
                  <option value="JP">🇯🇵 Japan</option>
                  <option value="UK">🇬🇧 United Kingdom</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="DE">🇩🇪 Germany</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="ES">🇪🇸 Spain</option>
                  <option value="CA">🇨🇦 Canada</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Generation</label>
                <select
                  value={profile.generation}
                  onChange={(e) => setProfile({ ...profile, generation: parseInt(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  {[1,2,3,4,5,6,7,8,9].map(gen => (
                    <option key={gen} value={gen}>Generation {gen}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Interests (comma-separated)</label>
                <input
                  type="text"
                  value={profile.interests.join(', ')}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.name}, {profile.age}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.bio}</p>
              </div>

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
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
            <div className="text-3xl font-bold text-yellow-500">{stats.matches}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Matches</div>
          </div>
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">{stats.swipes}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Swipes</div>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Reset your profile to default settings. This will not delete your matches.
        </p>
        <button
          onClick={handleReset}
          className="w-full px-4 py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Reset Profile
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
