import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SpriteAnimator from '../components/SpriteAnimator';

const BASE = import.meta.env.BASE_URL || '/';

// Theme options for character generation
const THEMES = [
  { id: 'cute', name: 'Cute', icon: '🌸', desc: 'Adorable kawaii style, soft colors' },
  { id: 'cool', name: 'Cool', icon: '😎', desc: 'Sleek stylish design, modern aesthetic' },
  { id: 'chibi', name: 'Chibi', icon: '🎨', desc: 'Big head, small body, super deformed' },
  { id: 'realistic', name: 'Realistic', icon: '📸', desc: '3D render, detailed textures' },
  { id: 'pixel', name: 'Pixel Art', icon: '👾', desc: 'Retro 16-bit style, crisp pixels' },
] as const;

type Theme = typeof THEMES[number]['id'];

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
  const [characterName, setCharacterName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<Theme>('cute');
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);
  const [existingCharacters, setExistingCharacters] = useState<ExistingCharacter[]>([]);
  const [previewAnimation, setPreviewAnimation] = useState<'idle' | 'walk'>('idle');
  const [previewDirection, setPreviewDirection] = useState('S');
  const [isLoading, setIsLoading] = useState(true);

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
    
    if (!characterName.trim() || !description.trim()) {
      toast.error('Please enter both character name and description');
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
          name: characterName,
          description,
          theme,
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
      setCharacterName('');
      setDescription('');
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
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

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
                ✨ Character Details
              </h3>

              {/* Character Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Character Name
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g., sparky, void_walker"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              {/* Theme Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visual Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        theme === t.id
                          ? 'border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-yellow-500/50'
                      }`}
                    >
                      <div className="text-lg mb-1">{t.icon}</div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your character: appearance, colors, style, personality..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example: "A small round yellow electric creature with red cheeks, pointy ears with black tips"
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    ✨ Generate Character
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Tips */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 text-sm">
              💡 Generation Tips
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Be specific about colors and shapes</li>
              <li>Mention body type (round, tall, slim)</li>
              <li>Include distinctive features (wings, horns, accessories)</li>
              <li>Generation takes 30-60 seconds per character</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Preview & Gallery */}
        <div className="space-y-6">
          {/* Live Preview */}
          {(generatedCharacter || existingCharacters.length > 0) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                👁️ Live Preview
              </h3>

              {generatedCharacter ? (
                <div className="space-y-4">
                  {/* Avatar Preview */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      <img
                        src={`${BASE}characters/${generatedCharacter.name}/avatar.png`}
                        alt={generatedCharacter.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `${BASE}characters/pika/avatar.png`;
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

                  {/* Sprite Animation Preview */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewAnimation('idle')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            previewAnimation === 'idle'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Idle
                        </button>
                        <button
                          onClick={() => setPreviewAnimation('walk')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            previewAnimation === 'walk'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
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

                    {/* Actions */}
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
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      generatedCharacter?.name === char.name
                        ? 'border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-yellow-500/50 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 mb-2 overflow-hidden">
                      {char.hasAvatar ? (
                        <img
                          src={`${BASE}characters/${char.name}/avatar.png`}
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
    </div>
  );
}
