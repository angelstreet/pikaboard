import { useState, useEffect, useRef, useSyncExternalStore } from 'react';

// ── Types ──────────────────────────────────────────────────────────

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

// ── Module-level WebSocket manager (persists across navigations) ──

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

const MAX_RETRIES = 5;
const BASE_DELAY = 3000;
const MAX_DELAY = 30000;

let ws: WebSocket | null = null;
let connectionState: ConnectionState = 'disconnected';
let connectionError: string | null = null;
let messages: Message[] = [];
let retries = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let listeners = new Set<() => void>();

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/openclaw/ws`;
}

function notify() {
  listeners.forEach((l) => l());
}

function setState(s: ConnectionState, err?: string | null) {
  connectionState = s;
  if (err !== undefined) connectionError = err;
  notify();
}

function addMessage(msg: Message) {
  messages = [...messages, msg];
  notify();
}

function setMessages(msgs: Message[]) {
  messages = msgs;
  notify();
}

function handleWsMessage(data: WebSocketMessage) {
  switch (data.type) {
    case 'connect.challenge':
      console.log('Received connect challenge:', data.challenge);
      break;

    case 'message':
    case 'response':
      if (data.content) {
        const assistantMsg: Message = {
          id: data.id || `msg-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
        };
        messages = [...messages.filter((m) => !m.pending), assistantMsg];
        notify();
      }
      break;

    case 'error':
      console.error('WebSocket error message:', data.error);
      connectionError = data.error || 'An error occurred';
      notify();
      break;

    case 'history':
      if (Array.isArray(data.data)) {
        const historyMessages: Message[] = (data.data as Array<{ role: string; content: string; id?: string; timestamp?: string }>).map((item) => ({
          id: item.id || `hist-${Date.now()}-${Math.random()}`,
          role: item.role as 'user' | 'assistant' | 'system',
          content: item.content,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
        }));
        setMessages(historyMessages);
      }
      break;

    default:
      console.log('Unknown message type:', data.type, data);
  }
}

function scheduleReconnect() {
  if (retries >= MAX_RETRIES) {
    setState('disconnected', `Failed to connect after ${MAX_RETRIES} attempts.`);
    return;
  }
  const delay = Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);
  retries++;
  reconnectTimer = setTimeout(connect, delay);
}

function connect() {
  // Don't reconnect if already open or connecting
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    setState('connecting', null);
    const socket = new WebSocket(getWebSocketUrl());

    socket.onopen = () => {
      console.log('WebSocket connected');
      retries = 0;
      setState('connected', null);
    };

    socket.onmessage = (event) => {
      try {
        handleWsMessage(JSON.parse(event.data));
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      ws = null;
      setState('disconnected');
      scheduleReconnect();
    };

    ws = socket;
  } catch (err) {
    console.error('Failed to create WebSocket connection:', err);
    setState('disconnected');
    scheduleReconnect();
  }
}

function manualReconnect() {
  retries = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  connect();
}

function sendWsMessage(content: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content,
    timestamp: new Date(),
  };
  addMessage(userMessage);

  ws.send(JSON.stringify({ type: 'message', id: userMessage.id, content }));

  addMessage({
    id: `pending-${Date.now()}`,
    role: 'assistant',
    content: 'Thinking...',
    timestamp: new Date(),
    pending: true,
  });
}

// Connect once at module load
connect();

// Snapshot helpers for useSyncExternalStore
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function getSnapshot() {
  return { connectionState, connectionError, messages };
}

// ── Component ──────────────────────────────────────────────────────

export default function Chat() {
  const store = useSyncExternalStore(subscribe, getSnapshot);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = store.connectionState === 'connected';
  const isConnecting = store.connectionState === 'connecting';

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;
    sendWsMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const statusColor = isConnecting ? 'bg-yellow-500' : isConnected ? 'bg-green-500' : 'bg-red-500';
  const statusText = isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected';

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
          <button
            onClick={!isConnected && !isConnecting ? manualReconnect : undefined}
            className={`flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 ${!isConnected && !isConnecting ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-default'}`}
          >
            <div className={`w-2 h-2 rounded-full ${statusColor} ${isConnecting ? 'animate-pulse' : ''}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">{statusText}</span>
          </button>
        </div>
      </div>

      {/* Connection Error */}
      {store.connectionError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{store.connectionError}</span>
          <button
            onClick={manualReconnect}
            className="ml-3 px-3 py-1 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {store.messages.length === 0 ? (
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
            store.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">
                      {message.role === 'user' ? '👤' : message.pending ? '⏳' : '⚡'}
                    </span>
                    <span className="text-xs font-medium opacity-75">
                      {message.role === 'user' ? 'You' : message.pending ? 'Pika is thinking...' : 'Pika'}
                    </span>
                    <span className="text-xs opacity-50">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
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
              placeholder={isConnected ? 'Type your message...' : 'Connecting...'}
              disabled={!isConnected}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pika-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isConnected || !inputMessage.trim()}
              className="px-6 py-2.5 bg-pika-500 hover:bg-pika-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Send</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
            Press Enter to send
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
        Powered by OpenClaw Gateway
      </div>
    </div>
  );
}
