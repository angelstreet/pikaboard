import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SpriteAnimator from '../components/SpriteAnimator';
import { useConfirmModal } from '../components/ConfirmModal';

const BASE = import.meta.env.BASE_URL || '/';

interface CharacterOption {
  name: string;
  displayName: string;
  description: string;
}

interface ThemeGroup {
  id: string;
  name: string;
  icon: string;
  characters: CharacterOption[];
}

const THEMES: ThemeGroup[] = [
  {
    id: 'naruto',
    name: 'Naruto',
    icon: '🦊',
    characters: [
      { name: 'naruto', displayName: 'Naruto Uzumaki', description: 'Young energetic ninja with spiky blonde hair, whisker marks on cheeks, orange jumpsuit, Konoha headband, blue eyes, determined grin.' },
      { name: 'sasuke', displayName: 'Sasuke Uchiha', description: 'Dark spiky hair, piercing red Sharingan eyes, blue high-collar shirt with Uchiha symbol, white arm guards and shorts, stoic expression.' },
      { name: 'sakura', displayName: 'Sakura Haruno', description: 'Pink hair in a bob cut, green eyes, red sleeveless top with diamond pattern, black shorts, gloves, strong medical ninja.' },
      { name: 'kakashi', displayName: 'Kakashi Hatake', description: 'Silver spiky hair, face mask covering mouth, slanted headband over left eye, green flak jacket, hands in pockets, copy ninja.' },
    ]
  },
  {
    id: 'pokemon',
    name: 'Pokémon',
    icon: '⚡',
    characters: [
      { name: 'pikachu', displayName: 'Pikachu', description: 'Small cute yellow mouse Pokémon with red cheeks, long black-tipped ears, brown stripes on back, zigzag tail, sparkling eyes.' },
      { name: 'charizard', displayName: 'Charizard', description: 'Large orange dragon-like Pokémon with wings, cream underbelly, blazing flame tail, horns, fierce yellow eyes.' },
      { name: 'bulbasaur', displayName: 'Bulbasaur', description: 'Small quadruped Pokémon with blue-green skin, large red eyes, bulb on back containing seeds, round snout.' },
      { name: 'mewtwo', displayName: 'Mewtwo', description: 'Tall humanoid purple psychic Pokémon, long tail, tube on back, intense purple eyes, sleek muscular build.' },
    ]
  },
  {
    id: 'dragonball',
    name: 'Dragon Ball',
    icon: '🐉',
    characters: [
      { name: 'goku', displayName: 'Goku', description: 'Spiky black hair, orange gi with blue undershirt, blue wristbands, muscular build, cheerful determined expression.' },
      { name: 'vegeta', displayName: 'Vegeta', description: 'Flame-shaped black hair, muscular Saiyan prince, blue bodysuit with white chest armor, red gloves and boots, arrogant smirk.' },
      { name: 'gohan', displayName: 'Gohan', description: 'Spiky black hair, purple gi over blue undershirt, similar to Goku but younger scholarly look, hidden power.' },
    ]
  }
];

interface GeneratedCharacter {
  name: string;
  displayName: string;
  path: string;
  manifest: {
    agent: string;
    cellSize: number;
    directions: number;
    animations: {
      idle: { file: string; frames: number; fps: number };
      walk: { file: string; frames: number; fps: number };
    };
  };
}

interface ExistingCharacter {
  name: string;
  hasAvatar: boolean;
  hasManifest: boolean;
  manifest: GeneratedCharacter['manifest'] | null;
  path: string;
}

export default function SoulSprite() {
  // Form state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterOption | null>(null);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);
  const [existingCharacters, setExistingCharacters] = useState<ExistingCharacter[]>([]);
  const [previewAnimation, setPreviewAnimation] = useState<'idle' | 'walk'>('idle');
  const [previewDirection, setPreviewDirection] = useState('S');
  const [isLoading, setIsLoading] = useState(true);

  // Confirm modal
  const { confirm, ConfirmModalComponent } = useConfirmModal();

  // Load existing characters on mount
  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BASE}api/soulsprite/characters`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pikaboard_token') || ''}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setExistingCharacters(data.characters || []);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCharacter) {
      toast.error('Please select a theme and character');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generating character sprites...');

    try {
      const response = await fetch(`${BASE}api/soulsprite/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pikaboard_token') || ''}`,
        },
        body: JSON.stringify({
          name: selectedCharacter.name,
          description: selectedCharacter.description,
          theme: selectedThemeId,
          apiKey: apiKey || undefined,
          debug: debugMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setGeneratedCharacter(data.character);
      toast.success(data.message, { id: toastId });
      
      // Refresh character list
      await loadCharacters();
      
      // Reset form
      setSelectedThemeId('');
      setSelectedCharacter(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      toast.error(message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (name: string) => {
    const toastId = toast.loading('Preparing download...');
    
    try {
      const response = await fetch(`${BASE}api/soulsprite/download/${name}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pikaboard_token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Download started!', { id: toastId });
    } catch (error) {
      toast.error('Failed to download character', { id: toastId });
    }
  };

  const handleDelete = async (name: string) => {
    const confirmed = await confirm({
      title: 'Delete Character?',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    const toastId = toast.loading('Deleting character...');

    try {
      const response = await fetch(`${BASE}api/soulsprite/characters/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pikaboard_token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast.success('Character deleted', { id: toastId });
      await loadCharacters();
      
      if (generatedCharacter?.name === name) {
        setGeneratedCharacter(null);
      }
    } catch (error) {
      toast.error('Failed to delete character', { id: toastId });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🎨 SoulSprite
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Character Generator
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate game-ready character sprites using AI
          </p>
        </div>
        <a
          href="/apps"
          className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
        >
          ← Back to Apps
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Generator Form */}
        <div className="space-y-6">
          {/* API Configuration */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                🔑 API Configuration
              </h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-600 dark:text-gray-400">Debug</span>
              </label>
            </div>
            
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Google Gemini API Key (optional)"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Uses system API key if not provided. Key is not stored.
            </p>
          </div>

          {/* Character Generator Form */}
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                ✨ Select Character
              </h3>

              {/* Theme Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedThemeId(t.id);
                        setSelectedCharacter(null);
                      }}
                      className={`p-4 rounded-xl border-2 text-center transition-all shadow-sm hover:shadow-md ${
                        selectedThemeId === t.id
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-500/50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      }`}
                    >
                      <div className="text-3xl mb-2 mx-auto">{t.icon}</div>
                      <div className="font-bold text-gray-900 dark:text-white text-base">
                        {t.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Character List */}
              {selectedThemeId && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Pick Character
                  </label>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50">
                    {THEMES.find((t) => t.id === selectedThemeId)?.characters.map((char) => (
                      <button
                        key={char.name}
                        type="button"
                        onClick={() => setSelectedCharacter(char)}
                        className={`w-full p-4 mb-3 last:mb-0 rounded-lg border text-left transition-all shadow-sm hover:shadow-md ${
                          selectedCharacter?.name === char.name
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-500/50'
                            : 'border-gray-200 dark:border-gray-700 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                        }`}
                      >
                        <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                          {char.displayName}
                        </div>
                        <div className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-2">
                          @{char.name}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                          {char.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Preview */}
              {selectedCharacter && (
                <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-200 dark:border-emerald-700 shadow-lg">
                  <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    ✅ Ready to Generate: {selectedCharacter.displayName}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedCharacter.description}
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="submit"
                disabled={!selectedCharacter || isGenerating}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                    Generating Sprites...
                  </>
                ) : (
                  <>
                    ✨ Generate {selectedCharacter?.displayName || 'Character'} Sprites
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Tips */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm flex items-center gap-2">
              💡 Quick Tips
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside grid grid-cols-2 gap-x-4">
              <li>Click theme, then character</li>
              <li>Preview shows exact description used</li>
              <li>Generation: 30-90s</li>
              <li>Download ZIP with all sprites</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Preview & Gallery - unchanged */}
        <div className="space-y-6">
          {(generatedCharacter || existingCharacters.length > 0) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                👁️ Live Preview
              </h3>
              {generatedCharacter ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      <img
                        src={\`${BASE}characters/\${generatedCharacter.name}/avatar.png\`}
                        alt={generatedCharacter.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = \`${BASE}characters/pika/avatar.png\`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {generatedCharacter.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        @{generatedCharacter.name}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Generated successfully
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewAnimation('idle')}
                          className={\`px-3 py-1 rounded text-xs font-medium transition-colors \${previewAnimation === 'idle' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}\`}
                        >
                          Idle
                        </button>
                        <button
                          onClick={() => setPreviewAnimation('walk')}
                          className={\`px-3 py-1 rounded text-xs font-medium transition-colors \${previewAnimation === 'walk' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}\`}
                        >
                          Walk
                        </button>
                      </div>
                      <select
                        value={previewDirection}
                        onChange={(e) => setPreviewDirection(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                      >
                        {['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="h-48 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                      <SpriteAnimator
                        agent={generatedCharacter.name}
                        animation={previewAnimation}
                        direction={previewDirection as any}
                        size={128}
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleDownload(generatedCharacter.name)}
                        className="flex-1 py-2 px-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        📦 Download ZIP
                      </button>
                      <button
                        onClick={() => handleDelete(generatedCharacter.name)}
                        className="py-2 px-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Select a character from the gallery to preview</p>
                </div>
              )}
            </div>
          )}

          {/* Character Gallery */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              🎭 Character Gallery
              <span className="text-xs font-normal text-gray-500">
                ({existingCharacters.length} characters)
              </span>
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
              </div>
            ) : existingCharacters.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">🎨</div>
                <p>No characters yet</p>
                <p className="text-sm">Generate your first character!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {existingCharacters.map((char) => (
                  <div
                    key={char.name}
                    onClick={() => {
                      if (char.manifest) {
                        setGeneratedCharacter({
                          name: char.name,
                          displayName: char.name,
                          path: char.path,
                          manifest: char.manifest,
                        });
                      }
                    }}
                    className={\`p-3 rounded-lg border cursor-pointer transition-all \${generatedCharacter?.name === char.name ? 'border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-yellow-500/50 bg-gray-50 dark:bg-gray-700/50'}\`}
                  >
                    <div className="w-full aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 mb-2 overflow-hidden">
                      {char.hasAvatar ? (
                        <img
                          src={\`${BASE}characters/\${char.name}/avatar.png\`}
                          alt={char.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🎭
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {char.name}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(char.name);
                        }}
                        className="flex-1 py-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        Download
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(char.name);
                        }}
                        className="py-1 px-2 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirm Modal */}
      <ConfirmModalComponent />
    </div>
  );
}