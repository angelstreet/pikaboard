import { useEffect, useState } from 'react';
import { api, Skill } from '../api/client';

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    try {
      setLoading(true);
      const data = await api.getSkills();
      setSkills(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading skills...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
        <button
          onClick={loadSkills}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🧩 Skills Library</h2>

      {skills.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">🧩</p>
          <p>No skills installed</p>
          <p className="text-sm mt-1">
            Add skills to your OpenClaw workspace
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg">{skill.name}</h3>
                <div className="flex gap-1">
                  {skill.hasSkillMd && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      SKILL.md
                    </span>
                  )}
                  {skill.hasReadme && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      README
                    </span>
                  )}
                </div>
              </div>
              {skill.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                  {skill.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3 font-mono truncate">
                {skill.path}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
