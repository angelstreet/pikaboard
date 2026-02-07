import { useState, useEffect } from 'react';
import { api, LibraryAgent, LibrarySkill, LibraryPlugin } from '../api/client';

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
  const cachedSkills = api.getCached<{ skills: LibrarySkill[]; agents: LibraryAgent[] }>('/library/skills');
  const cachedPlugins = api.getCached<{ plugins: LibraryPlugin[]; agents: LibraryAgent[] }>('/library/plugins');

  const [tab, setTab] = useState<'skills' | 'plugins'>('skills');
  const [skills, setSkills] = useState<LibrarySkill[]>(cachedSkills?.skills ?? []);
  const [plugins, setPlugins] = useState<LibraryPlugin[]>(cachedPlugins?.plugins ?? []);
  const [agents, setAgents] = useState<LibraryAgent[]>(cachedSkills?.agents ?? cachedPlugins?.agents ?? []);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedSkills);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!skills.length && !plugins.length) setLoading(true);
    try {
      const [skillsData, pluginsData] = await Promise.all([
        api.getLibrarySkills(),
        api.getLibraryPlugins(),
      ]);
      setSkills(skillsData.skills || []);
      if (skillsData.agents) setAgents(skillsData.agents);
      setPlugins(pluginsData.plugins || []);
      if (pluginsData.agents && agents.length === 0) setAgents(pluginsData.agents);
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by agent
  const filteredSkills = selectedAgent
    ? skills.filter((s) => s.usedBy.some((a) => a.id === selectedAgent))
    : skills;

  const filteredPlugins = selectedAgent
    ? plugins.filter((p) => p.usedBy.some((a) => a.id === selectedAgent))
    : plugins;

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

      {/* Agent Filter Bar */}
      {agents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">Filter by agent:</span>
          <button
            onClick={() => setSelectedAgent(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedAgent === null
                ? 'bg-pika-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              title={agent.name}
              className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                selectedAgent === agent.id
                  ? 'bg-pika-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{agent.emoji}</span>
              <span>{agent.name}</span>
            </button>
          ))}
        </div>
      )}

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
            🛠️ Skills ({filteredSkills.length})
          </button>
          <button
            onClick={() => setTab('plugins')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'plugins'
                ? 'border-pika-500 text-pika-600 dark:text-pika-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            🔌 Plugins ({filteredPlugins.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : tab === 'skills' ? (
        <SkillsList skills={filteredSkills} />
      ) : (
        <PluginsList plugins={filteredPlugins} />
      )}
    </div>
  );
}

function SkillsList({ skills }: { skills: LibrarySkill[] }) {
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
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {skill.usedBy && skill.usedBy.length > 0 ? (
                <>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Used by:</span>
                  {skill.usedBy.map((agent) => (
                    <span key={agent.id} title={agent.name} className="text-base cursor-default">
                      {agent.emoji}
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not assigned</span>
              )}
            </div>
            {skill.hasSkillMd && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                docs
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PluginsList({ plugins }: { plugins: LibraryPlugin[] }) {
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
                  Mode: {plugin.config.mode}
                </p>
              )}
              {/* Used by agents */}
              <div className="flex items-center gap-1 mt-1">
                {plugin.usedBy && plugin.usedBy.length > 0 ? (
                  <>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Used by:</span>
                    {plugin.usedBy.map((agent) => (
                      <span key={agent.id} title={agent.name} className="text-sm cursor-default">
                        {agent.emoji}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not assigned</span>
                )}
              </div>
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
