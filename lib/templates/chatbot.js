function chatbotTemplate() {
  return `
'use client';
import { useEffect, useMemo, useState } from 'react';

const CONVERSATIONS_KEY = 'autoverse_chat_conversations';
const ACTIVE_CHAT_KEY = 'autoverse_active_chat_id';
const STATS_KEY = 'autoverse_chat_stats';
const LEGACY_MESSAGES_KEY = 'autoverse_chat_messages';
const SETTINGS_KEY = 'autoverse_chatbot_settings';
const LOGS_KEY = 'autoverse_chat_logs';

const DEFAULT_SETTINGS = {
  enabled: true,
  assistantName: '',
  subtitle: 'Typically replies instantly',
  welcomeMessage: 'Hi! I am your assistant. How can I help you today?',
  placeholder: 'Type your message...',
  primaryColor: '#ffffff',
  accentColor: '#111111',
  launcherSize: 56,
  panelWidth: 360,
  panelHeight: 480,
  position: 'bottom-right',
  enterToSend: true,
  showTimestamps: false,
  persistHistory: true,
  systemInstruction: 'You are the helpful Autoverse dashboard assistant. Keep responses short, useful, and professional.',
  temperature: 0.7,
  maxOutputTokens: 512,
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function getAgentLabel() {
  return (
    process.env.NEXT_PUBLIC_AUTOVERSE_AGENT_NAME ||
    process.env.VITE_AUTOVERSE_AGENT_NAME ||
    process.env.REACT_APP_AUTOVERSE_AGENT_NAME ||
    'Autoverse'
  );
}

function makeWelcome(settings) {
  return {
    id: createId('msg'),
    role: 'bot',
    text: settings.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage,
    createdAt: nowIso(),
  };
}

function makeConversation(settings, title) {
  const createdAt = nowIso();
  return {
    id: createId('chat'),
    title: title || 'New chat',
    createdAt,
    updatedAt: createdAt,
    messages: [makeWelcome(settings)],
  };
}

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '');
    return parsed == null ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
}

function loadSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const saved = safeJson(localStorage.getItem(SETTINGS_KEY), {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

function readLogs() {
  return safeJson(localStorage.getItem(LOGS_KEY), []);
}

function writeLog(type, message, meta) {
  const entry = {
    id: createId('log'),
    type,
    message,
    meta: meta || {},
    createdAt: nowIso(),
  };
  const logs = [entry, ...readLogs()].slice(0, 300);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  window.dispatchEvent(new CustomEvent('autoverse-dashboard-updated'));
}

function normalizeConversation(conversation, settings) {
  const messages = Array.isArray(conversation.messages) && conversation.messages.length > 0
    ? conversation.messages.map((message) => ({
        id: message.id || createId('msg'),
        role: message.role === 'user' ? 'user' : 'bot',
        text: String(message.text || ''),
        createdAt: message.createdAt || conversation.updatedAt || conversation.createdAt || nowIso(),
      }))
    : [makeWelcome(settings)];
  const firstUser = messages.find((message) => message.role === 'user');
  return {
    id: conversation.id || createId('chat'),
    title: conversation.title || firstUser?.text?.slice(0, 42) || 'New chat',
    createdAt: conversation.createdAt || messages[0]?.createdAt || nowIso(),
    updatedAt: conversation.updatedAt || messages[messages.length - 1]?.createdAt || nowIso(),
    messages,
  };
}

function loadConversations(settings) {
  const saved = safeJson(localStorage.getItem(CONVERSATIONS_KEY), null);
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.map((conversation) => normalizeConversation(conversation, settings));
  }

  const legacy = safeJson(localStorage.getItem(LEGACY_MESSAGES_KEY), null);
  if (Array.isArray(legacy) && legacy.length > 0) {
    const migrated = normalizeConversation({
      id: createId('chat'),
      title: legacy.find((message) => message.role === 'user')?.text?.slice(0, 42) || 'Imported chat',
      createdAt: legacy[0]?.createdAt || nowIso(),
      updatedAt: legacy[legacy.length - 1]?.createdAt || nowIso(),
      messages: legacy,
    }, settings);
    return [migrated];
  }

  return [makeConversation(settings)];
}

function buildStats(conversations) {
  const allMessages = conversations.flatMap((conversation) => conversation.messages || []);
  const userCount = allMessages.filter((message) => message.role === 'user').length;
  const botCount = allMessages.filter((message) => message.role === 'bot').length;
  const lastMessageAt = allMessages.reduce((latest, message) => {
    if (!message.createdAt) return latest;
    return !latest || new Date(message.createdAt) > new Date(latest) ? message.createdAt : latest;
  }, null);
  return {
    totalChats: conversations.length,
    totalCount: allMessages.length,
    userCount,
    botCount,
    lastMessageAt,
  };
}

function saveConversations(conversations, activeChatId) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId || conversations[0]?.id || '');
  localStorage.setItem(STATS_KEY, JSON.stringify(buildStats(conversations)));
  window.dispatchEvent(new CustomEvent('autoverse-dashboard-updated'));
  window.dispatchEvent(new CustomEvent('autoverse-chat-stats-updated'));
}

export default function AutoverseChatbot() {
  const envAgentLabel = getAgentLabel();
  const LOGO_PATH = '/autoverse-logo.png';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  useEffect(() => {
    const nextSettings = loadSettings();
    const nextConversations = loadConversations(nextSettings);
    const savedActive = localStorage.getItem(ACTIVE_CHAT_KEY);
    const nextActive = nextConversations.some((conversation) => conversation.id === savedActive)
      ? savedActive
      : nextConversations[0]?.id || '';
    setSettings(nextSettings);
    setConversations(nextConversations);
    setActiveChatId(nextActive);
    saveConversations(nextConversations, nextActive);
  }, []);

  useEffect(() => {
    function syncSettings() {
      setSettings(loadSettings());
    }
    window.addEventListener('storage', syncSettings);
    window.addEventListener('autoverse-settings-updated', syncSettings);
    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('autoverse-settings-updated', syncSettings);
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeChatId) || conversations[0],
    [conversations, activeChatId]
  );
  const chatMessages = activeConversation?.messages || [];
  const assistantLabel = settings.assistantName || envAgentLabel;

  function updateConversation(updater, nextActiveId) {
    setConversations((current) => {
      const updated = updater(current);
      const activeId = nextActiveId || activeChatId || updated[0]?.id || '';
      saveConversations(updated, activeId);
      return updated;
    });
    if (nextActiveId) setActiveChatId(nextActiveId);
  }

  function handleNewChat() {
    const conversation = makeConversation(settings);
    setChatError('');
    setChatInput('');
    setIsLoading(false);
    updateConversation((current) => [conversation, ...current], conversation.id);
    writeLog('chat', 'New chat started', { chatId: conversation.id });
  }

  function renameConversationFromMessage(conversation, text) {
    if (!conversation || conversation.title !== 'New chat') return conversation;
    return { ...conversation, title: text.slice(0, 42) || 'New chat' };
  }

  async function handleSend() {
    const text = chatInput.trim();
    if (!text || isLoading || !activeConversation) return;

    setChatError('');
    setChatInput('');
    setIsLoading(true);

    const userMessage = { id: createId('msg'), role: 'user', text, createdAt: nowIso() };
    const afterUserMessages = [...(activeConversation.messages || []), userMessage];

    updateConversation((current) => current.map((conversation) => {
      if (conversation.id !== activeConversation.id) return conversation;
      return renameConversationFromMessage({
        ...conversation,
        messages: afterUserMessages,
        updatedAt: userMessage.createdAt,
      }, text);
    }));

    try {
      const response = await fetch('/api/autoverse-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: afterUserMessages, settings }),
      });
      const data = await response.json();
      if (!response.ok) {
        const details = data?.details ? ' ' + String(data.details).slice(0, 220) : '';
        throw new Error((data?.error || 'Failed to get assistant response.') + details);
      }
      const botMessage = {
        id: createId('msg'),
        role: 'bot',
        text: data?.reply || 'I could not generate a response right now.',
        createdAt: nowIso(),
      };
      updateConversation((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? { ...conversation, messages: [...afterUserMessages, botMessage], updatedAt: botMessage.createdAt }
          : conversation
      )));
      writeLog('chat', 'Assistant replied', { chatId: activeConversation.id });
    } catch (error) {
      const botMessage = {
        id: createId('msg'),
        role: 'bot',
        text: 'Unable to reply right now. Check your Gemini API key and try again.',
        createdAt: nowIso(),
      };
      updateConversation((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? { ...conversation, messages: [...afterUserMessages, botMessage], updatedAt: botMessage.createdAt }
          : conversation
      )));
      setChatError(error?.message || 'Chat request failed.');
      writeLog('error', 'Chat request failed', { chatId: activeConversation.id, error: error?.message || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  }

  if (!settings.enabled) return null;

  const isLeft = settings.position === 'bottom-left';

  return (
    <div style={{ ...styles.chatbotArea, right: isLeft ? 'auto' : '24px', left: isLeft ? '24px' : 'auto' }}>
      {chatOpen && (
        <section style={{ ...styles.chatbotPanel, width: settings.panelWidth + 'px', height: settings.panelHeight + 'px' }}>
          <div style={styles.chatbotHeader}>
            <div style={styles.chatbotTitleWrap}>
              <div style={{ ...styles.chatbotBadge, background: settings.primaryColor }}>
                <img src={LOGO_PATH} alt="Autoverse logo" style={styles.chatbotBadgeImage} />
              </div>
              <div>
                <h3 style={styles.chatbotTitle}>{assistantLabel} Assistant</h3>
                <p style={styles.chatbotSubtitle}>{settings.subtitle}</p>
              </div>
            </div>
            <div style={styles.chatbotHeaderActions}>
              <button style={styles.chatbotResetBtn} onClick={handleNewChat} aria-label="Start new chat" type="button">
                New Chat
              </button>
              <button style={styles.chatbotCloseBtn} onClick={() => setChatOpen(false)} aria-label="Close chat" type="button">
                x
              </button>
            </div>
          </div>

          <div style={styles.chatbotMessages}>
            {chatMessages.map((message) => (
              <div key={message.id} style={{ ...styles.messageRow, justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...styles.chatBubble, ...(message.role === 'user' ? { ...styles.userBubble, background: settings.primaryColor } : styles.botBubble) }}>
                  {message.text}
                  {settings.showTimestamps && <span style={styles.messageTime}>{new Date(message.createdAt).toLocaleTimeString()}</span>}
                </div>
              </div>
            ))}
            {isLoading && <div style={{ ...styles.chatBubble, ...styles.botBubble }}>Typing...</div>}
          </div>

          <div style={styles.chatbotComposer}>
            <input
              style={styles.chatbotInput}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={settings.placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && settings.enterToSend) handleSend();
              }}
              disabled={isLoading}
            />
            <button style={{ ...styles.chatbotSendBtn, background: settings.primaryColor }} type="button" onClick={handleSend} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          {chatError && <p style={styles.chatbotError}>{chatError}</p>}
        </section>
      )}

      <button
        style={{
          ...styles.chatbotLauncher,
          width: settings.launcherSize + 'px',
          height: settings.launcherSize + 'px',
          ...(chatOpen ? styles.chatbotLauncherActive : null),
        }}
        onClick={() => setChatOpen((prev) => !prev)}
        aria-label={chatOpen ? 'Close chatbot' : 'Open chatbot'}
        type="button"
      >
        <img src={LOGO_PATH} alt="Autoverse chatbot" style={styles.chatbotLauncherImage} />
      </button>
    </div>
  );
}

const styles = {
  chatbotArea: { position: 'fixed', bottom: '24px', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  chatbotPanel: { maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 104px)', background: '#0d0f12', border: '1px solid #23272f', borderRadius: '8px', boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatbotHeader: { padding: '14px', borderBottom: '1px solid #20242b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#11141a', gap: '12px' },
  chatbotTitleWrap: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  chatbotHeaderActions: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  chatbotBadge: { width: '34px', height: '34px', borderRadius: '8px', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 },
  chatbotBadgeImage: { width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' },
  chatbotTitle: { margin: 0, color: '#ffffff', fontSize: '14px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  chatbotSubtitle: { margin: '2px 0 0 0', color: '#98a2b3', fontSize: '11px' },
  chatbotCloseBtn: { width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #303642', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '16px', lineHeight: 1 },
  chatbotResetBtn: { height: '28px', borderRadius: '6px', border: '1px solid #303642', background: '#171b22', color: '#e5e7eb', cursor: 'pointer', fontSize: '11px', padding: '0 10px', whiteSpace: 'nowrap' },
  chatbotMessages: { flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0a0c10' },
  messageRow: { display: 'flex', width: '100%' },
  chatBubble: { maxWidth: '85%', fontSize: '13px', lineHeight: 1.45, borderRadius: '8px', padding: '10px 12px', wordBreak: 'break-word' },
  botBubble: { alignSelf: 'flex-start', color: '#e5e7eb', background: '#171b22', border: '1px solid #252b35' },
  userBubble: { alignSelf: 'flex-end', color: '#050505', border: '1px solid rgba(255, 255, 255, 0.18)' },
  messageTime: { display: 'block', marginTop: '6px', color: 'rgba(148, 163, 184, 0.85)', fontSize: '10px' },
  chatbotComposer: { padding: '12px', borderTop: '1px solid #20242b', background: '#11141a', display: 'flex', alignItems: 'center', gap: '8px' },
  chatbotInput: { flex: 1, height: '40px', borderRadius: '6px', border: '1px solid #303642', background: '#0a0c10', color: '#ffffff', fontSize: '13px', padding: '0 12px', outline: 'none', minWidth: 0 },
  chatbotSendBtn: { height: '40px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#050505', fontSize: '13px', fontWeight: '700', padding: '0 14px', cursor: 'pointer' },
  chatbotError: { margin: 0, borderTop: '1px solid #4c1d1d', padding: '8px 12px', color: '#fca5a5', fontSize: '12px', background: '#1f1111' },
  chatbotLauncher: { borderRadius: '999px', border: '1px solid #303642', background: '#11141a', cursor: 'pointer', boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', overflow: 'hidden' },
  chatbotLauncherActive: { border: '1px solid #667085' },
  chatbotLauncherImage: { width: '100%', height: '100%', objectFit: 'cover' },
};
`;
}

module.exports = { chatbotTemplate };
