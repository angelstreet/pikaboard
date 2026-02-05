import { useState, useEffect } from 'react';
import { API_BASE } from '../config/env';

interface Skill {
  name: string;
  description?: string;
  version?: string;
  hasSkillMd: boolean;
}

interface Plugin {
  name: string;
  enabled: boolean;
  connected?: boolean;
  config?: Record<string, unknown>;
}

const PLUGIN_ICONS: Record<string, string> = {
  slack: '💬',
  telegram: '✈️',
  discord: '🎮',
  whatsapp: '📱',
  signal: '🔒',
  googlechat: '💼',
  imessage: '💬',
};

export default function Library() {
  const [tab, setTab] = useState<'skills' | 'plugins'>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pikaboard_token') || '';
      const headers = { Authorization: `Bearer ${token}` };

      const [skillsRes, pluginsRes] = await Promise.all([
        fetch(`${API_BASE}/library/skills`, { headers }),
        fetch(`${API_BASE}/library/plugins`, { headers }),
      ]);

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkills(data.skills || []);
      }

      if (pluginsRes.ok) {
        const data = await pluginsRes.json();
        setPlugins(data.plugins || []);
      }
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📚 Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Installed skills and channel plugins
          </p>
        </div>
        <a
          href="https://clawhub.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-pika-600 hover:text-pika-700 dark:text-pika-400"
        >
          Browse ClawHub →
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setTab('skills')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'skills'
                ? 'border-pika-500 text-pika-600 dark:text-pika-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            🛠️ Skills ({skills.length})
          </button>
          <button
            onClick={() => setTab('plugins')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'plugins'
                ? 'border-pika-500 text-pika-600 dark:text-pika-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            🔌 Plugins ({plugins.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : tab === 'skills' ? (
        <SkillsList skills={skills} />
      ) : (
        <PluginsList plugins={plugins} />
      )}
    </div>
  );
}

function SkillsList({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No skills installed. Visit{' '}
        <a href="https://clawhub.com" className="text-pika-600 hover:underline">
          ClawHub
        </a>{' '}
        to find skills.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <div
          key={skill.name}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-pika-300 dark:hover:border-pika-600 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{skill.name}</h3>
            {skill.version && (
              <span className="text-xs text-gray-400 dark:text-gray-500">v{skill.version}</span>
            )}
          </div>
          {skill.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {skill.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {skill.hasSkillMd && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                SKILL.md
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PluginsList({ plugins }: { plugins: Plugin[] }) {
  if (plugins.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No channel plugins configured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plugins.map((plugin) => (
        <div
          key={plugin.name}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{PLUGIN_ICONS[plugin.name] || '🔌'}</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white capitalize">{plugin.name}</h3>
              {plugin.config?.mode && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mode: {String(plugin.config.mode)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                plugin.enabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${plugin.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
              />
              {plugin.enabled ? 'Connected' : 'Disabled'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
