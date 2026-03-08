import { useState, useEffect } from 'react';
import { mockProfiles, Profile, Match, currentUser, Message } from '../data/profiles';

const MATCHES_KEY = 'pikaboard_matches';
const MESSAGES_KEY = 'pikaboard_messages';

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState('');

  // Load matches from localStorage
  useEffect(() => {
    const storedMatches = localStorage.getItem(MATCHES_KEY);
    const storedMessages = localStorage.getItem(MESSAGES_KEY);
    
    if (storedMatches) {
      const matchIds: string[] = JSON.parse(storedMatches);
      const matchData: Match[] = matchIds.map(id => {
        const profile = mockProfiles.find(p => p.id === id);
        if (!profile) return null;
        return {
          id,
          profile,
          matchedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          unread: Math.floor(Math.random() * 3),
        };
      }).filter(Boolean) as Match[];
      setMatches(matchData);
    }

    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  const saveMessages = (newMessages: Record<string, Message[]>) => {
    setMessages(newMessages);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(newMessages));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedMatch) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    const newMessages = {
      ...messages,
      [selectedMatch.id]: [...(messages[selectedMatch.id] || []), message],
    };
    saveMessages(newMessages);
    setNewMessage('');

    // Simulate reply after 1-2 seconds
    setTimeout(() => {
      const replies = [
        "That sounds great! 😄",
        "I'd love that! 💕",
        "Tell me more!",
        "Interesting! What else?",
        "Haha, you're funny! 😂",
      ];
      const reply: Message = {
        id: `msg-${Date.now()}`,
        senderId: selectedMatch.profile.id,
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date(),
      };
      const updatedMessages = {
        ...messages,
        [selectedMatch.id]: [...(messages[selectedMatch.id] || []), message, reply],
      };
      saveMessages(updatedMessages);
    }, 1000 + Math.random() * 1000);
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60 * 1000) return 'Now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Matches List */}
      <div className={`
        ${selectedMatch ? 'hidden lg:flex' : 'flex'} 
        flex-col w-full lg:w-80 border-r border-gray-200 dark:border-gray-700
      `}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Matches</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{matches.length} matches</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <span className="text-5xl mb-4">💔</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No matches yet</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Start swiping to find your perfect match!
              </p>
            </div>
          ) : (
            matches.map(match => (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 ${
                  selectedMatch?.id === match.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className="relative">
                  <img
                    src={match.profile.image}
                    alt={match.profile.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {match.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {match.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {match.profile.name}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {formatTime(match.matchedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {messages[match.id]?.length 
                      ? messages[match.id][messages[match.id].length - 1].text
                      : 'New match! Say hello 👋'
                    }
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedMatch ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <button
              onClick={() => setSelectedMatch(null)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <span className="text-xl">←</span>
            </button>
            <button
              onClick={() => setSelectedMatch(null)}
              className="hidden lg:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <span className="text-xl">←</span>
            </button>
            <img
              src={selectedMatch.profile.image}
              alt={selectedMatch.profile.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {selectedMatch.profile.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gen {selectedMatch.profile.generation} • {selectedMatch.profile.distance}km
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center text-sm text-gray-400 mb-4">
              <p>You matched with {selectedMatch.profile.name}!</p>
            </div>
            {(messages[selectedMatch.id] || []).map(message => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    message.senderId === currentUser.id
                      ? 'bg-yellow-500 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === currentUser.id 
                      ? 'text-white/70' 
                      : 'text-gray-400'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Empty state for chat */
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center">
            <span className="text-6xl mb-4">💬</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a match
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose a conversation to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
