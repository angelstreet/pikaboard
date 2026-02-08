import { useState, useEffect, useRef, useSyncExternalStore } from 'react';

// ── Types ──────────────────────────────────────────────────────────

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  [key: string]: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: string[];
  timestamp: Date;
  pending?: boolean;
  streaming?: boolean;
}

// ── Content helpers ────────────────────────────────────────────────

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return (content as ContentBlock[])
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text!)
    .join('\n');
}

function extractToolCalls(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  return (content as ContentBlock[])
    .filter(b => (b.type === 'toolCall' || b.type === 'tool_use') && b.name)
    .map(b => b.name as string);
}

// ── Module-level WebSocket manager (persists across navigations) ──

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

const MAX_RETRIES = 5;
const BASE_DELAY = 3000;
const MAX_DELAY = 30000;
const SESSION_KEY = 'agent:main:main';
const RPC_TIMEOUT = 30000;

let ws: WebSocket | null = null;
let connectionState: ConnectionState = 'disconnected';
let connectionError: string | null = null;
let messages: Message[] = [];
let retries = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let listeners = new Set<() => void>();
let gatewayToken: string | null = null;
let reqCounter = 0;
let pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
let chatRunId: string | null = null;

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/openclaw/ws`;
}

function genReqId(): string {
  return `pk-${++reqCounter}-${Date.now().toString(36)}`;
}

function notify() {
  snapshot = { connectionState, connectionError, messages };
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

// ── JSON-RPC helpers ───────────────────────────────────────────────

function rpcCall(method: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not connected'));
      return;
    }
    const id = genReqId();
    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('RPC timeout'));
      }
    }, RPC_TIMEOUT);
    pendingRequests.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ type: 'req', id, method, params }));
  });
}

function clearPendingRequests(reason: string) {
  for (const [, { reject, timer }] of pendingRequests) {
    clearTimeout(timer);
    reject(new Error(reason));
  }
  pendingRequests.clear();
}

// ── Gateway token fetch ────────────────────────────────────────────

async function fetchGatewayToken(): Promise<string> {
  const token = localStorage.getItem('pikaboard_token') || '';
  const res = await fetch('/api/openclaw/gateway-token', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch gateway token');
  const data = await res.json();
  if (!data.token) throw new Error('No gateway token available');
  return data.token;
}

// ── History loading ────────────────────────────────────────────────

async function loadHistory() {
  try {
    const result = await rpcCall('chat.history', {
      sessionKey: SESSION_KEY,
      limit: 200,
    }) as { messages?: Array<{ role: string; content: unknown; timestamp?: number }> };

    if (result?.messages) {
      const parsed: Message[] = [];
      for (const m of result.messages) {
        if (m.role !== 'user' && m.role !== 'assistant') continue;
        const text = extractText(m.content);
        if (!text.trim()) continue;
        const tools = m.role === 'assistant' ? extractToolCalls(m.content) : [];
        parsed.push({
          id: `hist-${parsed.length}-${m.timestamp || Date.now()}`,
          role: m.role as 'user' | 'assistant',
          content: text,
          toolCalls: tools.length > 0 ? tools : undefined,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        });
      }
      setMessages(parsed);
    }
  } catch (err) {
    console.error('Failed to load chat history:', err);
  }
}

// ── Streaming event handler ────────────────────────────────────────

function handleStreamingEvent(data: Record<string, unknown>) {
  const state = data.state as string | undefined;
  const sessionKey = data.sessionKey as string | undefined;
  const runId = data.runId as string | undefined;

  // Only process events for our session and run
  if (sessionKey && sessionKey !== SESSION_KEY) return;
  if (runId && chatRunId && runId !== chatRunId) {
    if (state === 'final') {
      // Another run finished - refresh history
      loadHistory();
    }
    return;
  }

  if (state === 'delta') {
    // Accumulated response text
    const msg = data.message as Record<string, unknown> | undefined;
    const text = msg ? extractText(msg.content ?? msg) : '';
    if (text) {
      messages = messages.map(m =>
        m.streaming
          ? { ...m, content: text, pending: false }
          : m
      );
      notify();
    }
  } else if (state === 'final') {
    chatRunId = null;
    // Reload history for clean final state
    loadHistory();
  } else if (state === 'aborted') {
    chatRunId = null;
    messages = messages.filter(m => !m.streaming);
    notify();
  } else if (state === 'error') {
    chatRunId = null;
    const errorMsg = (data.errorMessage as string) || 'An error occurred';
    messages = messages.map(m =>
      m.streaming
        ? { ...m, content: errorMsg, pending: false, streaming: false }
        : m
    );
    notify();
  }
}

// ── Gateway message handler ────────────────────────────────────────

async function handleGatewayMessage(data: Record<string, unknown>) {
  // JSON-RPC response
  if (data.type === 'res') {
    const id = data.id as string;
    const pending = pendingRequests.get(id);
    if (pending) {
      pendingRequests.delete(id);
      clearTimeout(pending.timer);
      if (data.ok) {
        pending.resolve(data.payload);
      } else {
        const err = data.error as { message?: string } | undefined;
        pending.reject(new Error(err?.message || 'RPC error'));
      }
    }
    return;
  }

  // Events
  if (data.type === 'event') {
    const event = data.event as string | undefined;

    if (event === 'connect.challenge') {
      // Respond with connect handshake
      try {
        await rpcCall('connect', {
          minProtocol: 3,
          maxProtocol: 3,
          client: { id: 'webchat-ui', version: 'dev', platform: 'web', mode: 'webchat' },
          role: 'operator',
          scopes: [],
          caps: [],
          auth: { token: gatewayToken },
          userAgent: navigator.userAgent,
          locale: navigator.language,
        });
        retries = 0;
        setState('connected', null);
        await loadHistory();
      } catch (err) {
        console.error('Connect handshake failed:', err);
        gatewayToken = null; // Clear so next retry re-fetches
        setState('disconnected', 'Authentication failed');
        ws?.close();
      }
      return;
    }

    // Streaming events have state + sessionKey fields
    if (data.state || (data as Record<string, unknown>).sessionKey) {
      handleStreamingEvent(data as Record<string, unknown>);
    }
  }
}

// ── Connection management ──────────────────────────────────────────

function scheduleReconnect() {
  if (retries >= MAX_RETRIES) {
    setState('disconnected', `Failed to connect after ${MAX_RETRIES} attempts.`);
    return;
  }
  const delay = Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);
  retries++;
  reconnectTimer = setTimeout(connect, delay);
}

async function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    setState('connecting', null);

    // Fetch gateway token if not cached
    if (!gatewayToken) {
      gatewayToken = await fetchGatewayToken();
    }

    const socket = new WebSocket(getWebSocketUrl());

    socket.onmessage = (event) => {
      try {
        handleGatewayMessage(JSON.parse(event.data));
      } catch (err) {
        console.error('Failed to parse gateway message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      ws = null;
      clearPendingRequests('Connection closed');
      chatRunId = null;
      setState('disconnected');
      scheduleReconnect();
    };

    ws = socket;
  } catch (err) {
    console.error('Failed to connect:', err);
    setState('disconnected', err instanceof Error ? err.message : 'Connection failed');
    scheduleReconnect();
  }
}

function manualReconnect() {
  retries = 0;
  gatewayToken = null; // Force re-fetch
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

function sendMessage(content: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN || connectionState !== 'connected') return;

  const userMsg: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content,
    timestamp: new Date(),
  };
  addMessage(userMsg);

  const runId = genReqId();
  chatRunId = runId;

  addMessage({
    id: `stream-${runId}`,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    pending: true,
    streaming: true,
  });

  rpcCall('chat.send', {
    sessionKey: SESSION_KEY,
    message: content,
    deliver: false,
    idempotencyKey: runId,
  }).catch(err => {
    console.error('Failed to send message:', err);
    chatRunId = null;
    messages = messages.map(m =>
      m.streaming
        ? { ...m, content: `Error: ${err.message}`, pending: false, streaming: false }
        : m
    );
    notify();
  });
}

// ── External store ─────────────────────────────────────────────────

interface StoreSnapshot {
  connectionState: ConnectionState;
  connectionError: string | null;
  messages: Message[];
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
let snapshot: StoreSnapshot = { connectionState, connectionError, messages };
function getSnapshot(): StoreSnapshot {
  return snapshot;
}

// ── Component ──────────────────────────────────────────────────────

export default function Chat() {
  const store = useSyncExternalStore(subscribe, getSnapshot);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = store.connectionState === 'connected';
  const isConnecting = store.connectionState === 'connecting';

  // Connect WS only when Chat page mounts, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
        ws = null;
      }
      clearPendingRequests('Unmounted');
      chatRunId = null;
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;
    sendMessage(inputMessage.trim());
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
            Session: <span className="font-mono text-xs">{SESSION_KEY}</span>
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
                {isConnecting ? 'Connecting...' : isConnected ? 'Welcome! I\'m Pika' : 'Disconnected'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                {isConnecting
                  ? 'Loading conversation history...'
                  : isConnected
                  ? 'Your conversation history will appear here. Ask me anything!'
                  : 'Unable to connect to the gateway. Click retry to reconnect.'}
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
                  {message.pending && !message.content ? (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="animate-pulse">Thinking</span>
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  )}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {message.toolCalls.map((tool, i) => (
                        <span key={i} className="inline-flex items-center text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                          🔧 {tool}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.streaming && message.content && (
                    <span className="inline-block w-2 h-4 bg-gray-500 dark:bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
                  )}
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
