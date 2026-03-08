import { useState } from 'react';
import { Filters, countries, generations } from '../data/profiles';

interface FilterSheetProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterSheet({ filters, onChange, isOpen, onClose }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleSave = () => {
    onChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: Filters = {
      ageMin: 18,
      ageMax: 50,
      distanceMax: 100,
      country: '',
      generation: [],
    };
    setLocalFilters(resetFilters);
  };

  const toggleGeneration = (gen: number) => {
    const newGens = localFilters.generation.includes(gen)
      ? localFilters.generation.filter(g => g !== gen)
      : [...localFilters.generation, gen];
    setLocalFilters({ ...localFilters, generation: newGens });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" />
        </div>

        <div className="p-4 space-y-6">
          {/* Age Range */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Age Range</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Min Age</label>
                <input
                  type="number"
                  min={18}
                  max={localFilters.ageMax}
                  value={localFilters.ageMin}
                  onChange={(e) => setLocalFilters({ ...localFilters, ageMin: parseInt(e.target.value) || 18 })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <span className="text-gray-400 mt-5">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Max Age</label>
                <input
                  type="number"
                  min={localFilters.ageMin}
                  max={100}
                  value={localFilters.ageMax}
                  onChange={(e) => setLocalFilters({ ...localFilters, ageMax: parseInt(e.target.value) || 100 })}
                  className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <input
              type="range"
              min={18}
              max={100}
              value={localFilters.ageMax}
              onChange={(e) => setLocalFilters({ ...localFilters, ageMax: parseInt(e.target.value) })}
              className="w-full mt-3 accent-yellow-500"
            />
          </div>

          {/* Distance */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Distance: {localFilters.distanceMax === 100 ? 'Anywhere' : `${localFilters.distanceMax}km`}
            </h3>
            <input
              type="range"
              min={1}
              max={100}
              value={localFilters.distanceMax}
              onChange={(e) => setLocalFilters({ ...localFilters, distanceMax: parseInt(e.target.value) })}
              className="w-full accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1km</span>
              <span>100km+</span>
            </div>
          </div>

          {/* Country */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Country</h3>
            <select
              value={localFilters.country}
              onChange={(e) => setLocalFilters({ ...localFilters, country: e.target.value })}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="">Any Country</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Generation */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Pokemon Generation</h3>
            <div className="flex flex-wrap gap-2">
              {generations.map(gen => (
                <button
                  key={gen}
                  onClick={() => toggleGeneration(gen)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    localFilters.generation.includes(gen)
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Gen {gen}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
