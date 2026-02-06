import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  pending?: boolean;
}

interface WebSocketMessage {
  type: string;
  id?: string;
  data?: unknown;
  content?: string;
  challenge?: string;
  error?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL based on environment
  const getWebSocketUrl = () => {
    // Use relative path for production, direct localhost for development
    if (window.location.hostname === 'localhost') {
      return 'ws://localhost:18789/ws';
    }
    // For production, use the same host with ws:// protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error. Retrying...');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setIsConnecting(false);
      setConnectionError('Failed to connect. Retrying...');
      
      // Retry after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'connect.challenge':
        // Respond to challenge (if needed by the protocol)
        console.log('Received connect challenge:', data.challenge);
        // The OpenClaw protocol may require a response here
        break;

      case 'message':
      case 'response':
        // Handle assistant response
        if (data.content) {
          const assistantMessage: Message = {
            id: data.id || `msg-${Date.now()}`,
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
          };
          setMessages((prev) => {
            // Remove any pending message and add the response
            const filtered = prev.filter((m) => !m.pending);
            return [...filtered, assistantMessage];
          });
        }
        break;

      case 'error':
        console.error('WebSocket error message:', data.error);
        setConnectionError(data.error || 'An error occurred');
        break;

      case 'history':
        // Handle conversation history if provided
        if (Array.isArray(data.data)) {
          const historyMessages: Message[] = data.data.map((item: unknown) => {
            const msg = item as { role: string; content: string; id?: string; timestamp?: string };
            return {
              id: msg.id || `hist-${Date.now()}-${Math.random()}`,
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            };
          });
          setMessages(historyMessages);
        }
        break;

      default:
        console.log('Unknown message type:', data.type, data);
    }
  };

  // Send message to WebSocket
  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);

    // Send to WebSocket
    const wsMessage: WebSocketMessage = {
      type: 'message',
      id: userMessage.id,
      content: userMessage.content,
    };

    wsRef.current.send(JSON.stringify(wsMessage));

    // Add pending indicator
    setMessages((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}`,
        role: 'assistant',
        content: 'Thinking...',
        timestamp: new Date(),
        pending: true,
      },
    ]);

    setInputMessage('');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const getConnectionStatusColor = () => {
    if (isConnecting) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getConnectionStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            💬 Chat with Pika
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Talk directly to Pika through the OpenClaw gateway
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} animate-pulse`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getConnectionStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
          {connectionError}
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-6xl mb-4">⚡</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome! I'm Pika
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                I'm your AI assistant. Ask me anything about your tasks, projects, or anything else!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-pika-500 text-white'
                      : message.pending
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 italic'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {/* Avatar and Role Label */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">
                      {message.role === 'user' ? '👤' : message.pending ? '⏳' : '⚡'}
                    </span>
                    <span className="text-xs font-medium opacity-75">
                      {message.role === 'user' ? 'You' : message.pending ? 'Pika is thinking...' : 'Pika'}
                    </span>
                    <span className="text-xs opacity-50">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pika-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isConnected || !inputMessage.trim()}
              className="px-6 py-2.5 bg-pika-500 hover:bg-pika-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Send</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                  clipRule="evenodd"
                  transform="rotate(90 10 10)"
                />
              </svg>
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
        Powered by OpenClaw Gateway • Native WebSocket Connection
      </div>
    </div>
  );
}
