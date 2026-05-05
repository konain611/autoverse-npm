function dashboardTemplate() {
  return `
'use client';
import { useEffect, useMemo, useState } from 'react';

const CONVERSATIONS_KEY = 'autoverse_chat_conversations';
const ACTIVE_CHAT_KEY = 'autoverse_active_chat_id';
const STATS_KEY = 'autoverse_chat_stats';
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

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'agent-settings', label: 'Agent Settings' },
  { key: 'history', label: 'History' },
  { key: 'logs', label: 'Logs' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'about', label: 'About' },
];

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '');
    return parsed == null ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
}

function createId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function getPublicEnv(key) {
  const processEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return processEnv[key] || viteEnv[key] || '';
}

function readLogs() {
  return safeJson(localStorage.getItem(LOGS_KEY), []);
}

function writeLog(type, message, meta) {
  const entry = { id: createId('log'), type, message, meta: meta || {}, createdAt: nowIso() };
  const logs = [entry, ...readLogs()].slice(0, 300);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function normalizeConversation(conversation) {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const firstUser = messages.find((message) => message.role === 'user');
  return {
    id: conversation.id || createId('chat'),
    title: conversation.title || firstUser?.text?.slice(0, 42) || 'New chat',
    createdAt: conversation.createdAt || messages[0]?.createdAt || nowIso(),
    updatedAt: conversation.updatedAt || messages[messages.length - 1]?.createdAt || nowIso(),
    messages: messages.map((message) => ({
      id: message.id || createId('msg'),
      role: message.role === 'user' ? 'user' : 'bot',
      text: String(message.text || ''),
      createdAt: message.createdAt || conversation.updatedAt || nowIso(),
    })),
  };
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

function loadConversations() {
  const saved = safeJson(localStorage.getItem(CONVERSATIONS_KEY), []);
  return Array.isArray(saved) ? saved.map(normalizeConversation) : [];
}

function saveConversations(conversations, activeId) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  localStorage.setItem(STATS_KEY, JSON.stringify(buildStats(conversations)));
  if (activeId) localStorage.setItem(ACTIVE_CHAT_KEY, activeId);
  window.dispatchEvent(new CustomEvent('autoverse-dashboard-updated'));
}

export default function AutoverseDashboardHome() {
  const AGENT_NAME =
    getPublicEnv('NEXT_PUBLIC_AUTOVERSE_AGENT_NAME') ||
    getPublicEnv('VITE_AUTOVERSE_AGENT_NAME') ||
    getPublicEnv('REACT_APP_AUTOVERSE_AGENT_NAME') ||
    'Autoverse';

  const [authorized, setAuthorized] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');

  function navigateTo(path, replace = false) {
    if (replace) {
      window.location.replace(path);
      return;
    }
    window.location.assign(path);
  }

  function syncDashboard() {
    const nextConversations = loadConversations();
    const nextSettings = { ...DEFAULT_SETTINGS, ...safeJson(localStorage.getItem(SETTINGS_KEY), {}) };
    const savedActive = localStorage.getItem(ACTIVE_CHAT_KEY);
    setConversations(nextConversations);
    setSettings(nextSettings);
    setLogs(readLogs());
    setActiveChatId(
      nextConversations.some((conversation) => conversation.id === savedActive)
        ? savedActive
        : nextConversations[0]?.id || ''
    );
  }

  useEffect(() => {
    if (localStorage.getItem('autoverse_auth') !== 'true') {
      navigateTo('/autoverse-dashboard', true);
    } else {
      setAuthorized(true);
      syncDashboard();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncDashboard);
    window.addEventListener('autoverse-dashboard-updated', syncDashboard);
    window.addEventListener('autoverse-chat-stats-updated', syncDashboard);
    return () => {
      window.removeEventListener('storage', syncDashboard);
      window.removeEventListener('autoverse-dashboard-updated', syncDashboard);
      window.removeEventListener('autoverse-chat-stats-updated', syncDashboard);
    };
  }, []);

  const stats = useMemo(() => buildStats(conversations), [conversations]);
  const activeConversation = conversations.find((conversation) => conversation.id === activeChatId) || conversations[0];

  function handleLogout() {
    localStorage.removeItem('autoverse_auth');
    navigateTo('/autoverse-dashboard', true);
  }

  function saveSettings(nextSettings) {
    setSettings(nextSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    writeLog('settings', 'Dashboard settings updated', {});
    window.dispatchEvent(new CustomEvent('autoverse-settings-updated'));
    window.dispatchEvent(new CustomEvent('autoverse-dashboard-updated'));
  }

  function updateSetting(key, value) {
    saveSettings({ ...settings, [key]: value });
  }

  function selectConversation(id) {
    localStorage.setItem(ACTIVE_CHAT_KEY, id);
    setActiveChatId(id);
    setActivePage('history');
  }

  function renameConversation(id, title) {
    const next = conversations.map((conversation) => (
      conversation.id === id ? { ...conversation, title: title || 'Untitled chat' } : conversation
    ));
    setConversations(next);
    saveConversations(next, id);
    writeLog('history', 'Conversation renamed', { chatId: id });
  }

  function deleteConversation(id) {
    const next = conversations.filter((conversation) => conversation.id !== id);
    const nextActive = next[0]?.id || '';
    setConversations(next);
    setActiveChatId(nextActive);
    saveConversations(next, nextActive);
    writeLog('history', 'Conversation deleted', { chatId: id });
  }

  function exportData() {
    const payload = {
      exportedAt: nowIso(),
      settings,
      stats,
      conversations,
      logs,
    };
    const text = JSON.stringify(payload, null, 2);
    navigator.clipboard?.writeText(text);
    writeLog('data', 'Dashboard data copied to clipboard', { chats: conversations.length });
    syncDashboard();
  }

  if (!authorized) return null;

  return (
    <div style={styles.root}>
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? '252px' : '72px' }}>
        <div style={styles.brand}>
          <div style={styles.brandLeft}>
            <img src="/autoverse-logo.png" alt="Autoverse logo" style={styles.brandLogo} />
            {sidebarOpen && (
              <div>
                <div style={styles.brandText}>Autoverse</div>
                <div style={styles.brandSub}>Admin Console</div>
              </div>
            )}
          </div>
          <button style={styles.iconBtn} onClick={() => setSidebarOpen(!sidebarOpen)} type="button" title="Toggle sidebar">
            {sidebarOpen ? '<' : '>'}
          </button>
        </div>
        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              style={{
                ...styles.navItem,
                background: activePage === item.key ? '#ffffff' : 'transparent',
                color: activePage === item.key ? '#050505' : '#a7b0be',
              }}
              onClick={() => setActivePage(item.key)}
              type="button"
            >
              <NavIcon name={item.key} active={activePage === item.key} />
              {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={handleLogout} type="button">
            <LogoutIcon />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <PageContent
          activePage={activePage}
          agentName={settings.assistantName || AGENT_NAME}
          stats={stats}
          conversations={conversations}
          activeConversation={activeConversation}
          activeChatId={activeChatId}
          settings={settings}
          logs={logs}
          query={query}
          setQuery={setQuery}
          updateSetting={updateSetting}
          selectConversation={selectConversation}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          exportData={exportData}
        />
      </main>
    </div>
  );
}

function PageContent(props) {
  const {
    activePage,
    agentName,
    stats,
    conversations,
    activeConversation,
    activeChatId,
    settings,
    logs,
    query,
    setQuery,
    updateSetting,
    selectConversation,
    renameConversation,
    deleteConversation,
    exportData,
  } = props;

  if (activePage === 'agent-settings') {
    return <SettingsPage settings={settings} updateSetting={updateSetting} exportData={exportData} />;
  }
  if (activePage === 'history') {
    return (
      <HistoryPage
        conversations={conversations}
        activeConversation={activeConversation}
        activeChatId={activeChatId}
        query={query}
        setQuery={setQuery}
        selectConversation={selectConversation}
        renameConversation={renameConversation}
        deleteConversation={deleteConversation}
      />
    );
  }
  if (activePage === 'logs') return <LogsPage logs={logs} />;
  if (activePage === 'integrations') return <IntegrationsPage />;
  if (activePage === 'documentation') return <DocumentationPage />;
  if (activePage === 'about') return <AboutPage />;
  return <DashboardPage agentName={agentName} stats={stats} conversations={conversations} logs={logs} selectConversation={selectConversation} />;
}

function NavIcon({ name, active }) {
  const ink = active ? '#050505' : '#a7b0be';
  if (name === 'dashboard') {
    return (
      <span style={{ ...styles.navIconBox, ...styles.dashboardGrid }}>
        <span style={{ ...styles.gridMark, borderColor: ink }} />
        <span style={{ ...styles.gridMark, borderColor: ink }} />
        <span style={{ ...styles.gridMark, borderColor: ink }} />
        <span style={{ ...styles.gridMark, borderColor: ink }} />
      </span>
    );
  }
  if (name === 'agent-settings') {
    return (
      <span style={styles.navIconBox}>
        <span style={{ ...styles.sliderLine, background: ink, top: '8px' }} />
        <span style={{ ...styles.sliderLine, background: ink, top: '16px' }} />
        <span style={{ ...styles.sliderKnob, borderColor: ink, left: '8px', top: '4px' }} />
        <span style={{ ...styles.sliderKnob, borderColor: ink, left: '17px', top: '12px' }} />
      </span>
    );
  }
  if (name === 'history') {
    return (
      <span style={styles.navIconBox}>
        <span style={{ ...styles.clockCircle, borderColor: ink }} />
        <span style={{ ...styles.clockHand, background: ink, height: '7px', left: '14px', top: '7px' }} />
        <span style={{ ...styles.clockHand, background: ink, height: '6px', left: '16px', top: '13px', transform: 'rotate(90deg)' }} />
      </span>
    );
  }
  if (name === 'logs') {
    return (
      <span style={styles.navIconBox}>
        <span style={{ ...styles.logLine, background: ink, top: '7px', width: '18px' }} />
        <span style={{ ...styles.logLine, background: ink, top: '13px', width: '14px' }} />
        <span style={{ ...styles.logLine, background: ink, top: '19px', width: '18px' }} />
      </span>
    );
  }
  if (name === 'integrations') {
    return (
      <span style={styles.navIconBox}>
        <span style={{ ...styles.plugStem, borderColor: ink }} />
        <span style={{ ...styles.plugPin, background: ink, left: '10px' }} />
        <span style={{ ...styles.plugPin, background: ink, left: '17px' }} />
      </span>
    );
  }
  if (name === 'documentation') {
    return (
      <span style={styles.navIconBox}>
        <span style={{ ...styles.bookMark, borderColor: ink }} />
        <span style={{ ...styles.bookFold, background: ink }} />
      </span>
    );
  }
  return (
    <span style={styles.navIconBox}>
      <span style={{ ...styles.infoCircle, borderColor: ink }} />
      <span style={{ ...styles.infoDot, background: ink }} />
      <span style={{ ...styles.infoLine, background: ink }} />
    </span>
  );
}

function LogoutIcon() {
  return (
    <span style={styles.navIconBox}>
      <span style={styles.logoutDoor} />
      <span style={styles.logoutArrowLine} />
      <span style={styles.logoutArrowHead} />
    </span>
  );
}

function DashboardPage({ agentName, stats, conversations, logs, selectConversation }) {
  const recent = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>{agentName} Dashboard</h1>
          <p style={styles.pageSub}>Every chat remains stored, counted, and visible from this console.</p>
        </div>
        <div style={styles.statusPill}>Active</div>
      </div>
      <div style={styles.statsGrid}>
        <StatCard label="Total chats" value={stats.totalChats || 0} />
        <StatCard label="Total messages" value={stats.totalCount || 0} />
        <StatCard label="User messages" value={stats.userCount || 0} />
        <StatCard label="Bot replies" value={stats.botCount || 0} />
        <StatCard label="Last message" value={formatDate(stats.lastMessageAt)} wide />
      </div>
      <div style={styles.twoCol}>
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Recent Conversations</h2>
            <span style={styles.muted}>{recent.length} shown</span>
          </div>
          <div style={styles.list}>
            {recent.length === 0 && <EmptyState text="No conversations yet." />}
            {recent.map((conversation) => (
              <button key={conversation.id} style={styles.chatListItem} onClick={() => selectConversation(conversation.id)} type="button">
                <span style={styles.chatTitle}>{conversation.title}</span>
                <span style={styles.chatMeta}>{conversation.messages.length} messages | {formatDate(conversation.updatedAt)}</span>
              </button>
            ))}
          </div>
        </section>
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Activity</h2>
            <span style={styles.muted}>{logs.length} events</span>
          </div>
          <div style={styles.list}>
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} style={styles.logItem}>
                <span style={styles.logType}>{log.type}</span>
                <span style={styles.logText}>{log.message}</span>
                <span style={styles.chatMeta}>{formatDate(log.createdAt)}</span>
              </div>
            ))}
            {logs.length === 0 && <EmptyState text="No activity recorded yet." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, wide }) {
  return (
    <div style={{ ...styles.statCard, gridColumn: wide ? 'span 2' : 'auto' }}>
      <p style={styles.statValue}>{String(value)}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

function SettingsPage({ settings, updateSetting, exportData }) {
  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Agent Settings</h1>
          <p style={styles.pageSub}>Control the chatbot experience, behavior, and stored data from one place.</p>
        </div>
        <button style={styles.primaryBtn} onClick={exportData} type="button">Copy Export</button>
      </div>
      <div style={styles.settingsGrid}>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Behavior</h2>
          <Toggle label="Chatbot enabled" value={settings.enabled} onChange={(value) => updateSetting('enabled', value)} />
          <Toggle label="Enter sends message" value={settings.enterToSend} onChange={(value) => updateSetting('enterToSend', value)} />
          <Toggle label="Show timestamps" value={settings.showTimestamps} onChange={(value) => updateSetting('showTimestamps', value)} />
          <Field label="Assistant name" value={settings.assistantName} placeholder="Use environment agent name" onChange={(value) => updateSetting('assistantName', value)} />
          <Field label="Header subtitle" value={settings.subtitle} onChange={(value) => updateSetting('subtitle', value)} />
          <Field label="Input placeholder" value={settings.placeholder} onChange={(value) => updateSetting('placeholder', value)} />
          <TextArea label="Welcome message" value={settings.welcomeMessage} onChange={(value) => updateSetting('welcomeMessage', value)} />
        </section>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Model</h2>
          <TextArea label="System instruction" value={settings.systemInstruction} rows={7} onChange={(value) => updateSetting('systemInstruction', value)} />
          <Range label="Temperature" min={0} max={2} step={0.1} value={settings.temperature} onChange={(value) => updateSetting('temperature', value)} />
          <Range label="Max output tokens" min={64} max={2048} step={64} value={settings.maxOutputTokens} onChange={(value) => updateSetting('maxOutputTokens', value)} />
        </section>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Appearance</h2>
          <ColorField label="Primary color" value={settings.primaryColor} onChange={(value) => updateSetting('primaryColor', value)} />
          <SelectField label="Position" value={settings.position} options={['bottom-right', 'bottom-left']} onChange={(value) => updateSetting('position', value)} />
          <Range label="Launcher size" min={44} max={84} step={2} value={settings.launcherSize} onChange={(value) => updateSetting('launcherSize', value)} />
          <Range label="Panel width" min={300} max={520} step={10} value={settings.panelWidth} onChange={(value) => updateSetting('panelWidth', value)} />
          <Range label="Panel height" min={380} max={720} step={10} value={settings.panelHeight} onChange={(value) => updateSetting('panelHeight', value)} />
        </section>
      </div>
    </div>
  );
}

function HistoryPage({ conversations, activeConversation, activeChatId, query, setQuery, selectConversation, renameConversation, deleteConversation }) {
  const filtered = conversations.filter((conversation) => {
    const haystack = [conversation.title, ...(conversation.messages || []).map((message) => message.text)].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>History</h1>
          <p style={styles.pageSub}>Separate preserved records for every chat, with full message transcripts.</p>
        </div>
        <input style={styles.searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats..." />
      </div>
      <div style={styles.historyLayout}>
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>All Chats</h2>
            <span style={styles.muted}>{filtered.length} of {conversations.length}</span>
          </div>
          <div style={styles.list}>
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                style={{ ...styles.chatListItem, borderColor: conversation.id === activeChatId ? '#ffffff' : '#252b35' }}
                onClick={() => selectConversation(conversation.id)}
                type="button"
              >
                <span style={styles.chatTitle}>{conversation.title}</span>
                <span style={styles.chatMeta}>{conversation.messages.length} messages | {formatDate(conversation.updatedAt)}</span>
              </button>
            ))}
            {filtered.length === 0 && <EmptyState text="No matching conversations." />}
          </div>
        </section>
        <section style={styles.panel}>
          {activeConversation ? (
            <>
              <div style={styles.panelHeader}>
                <input
                  style={styles.titleInput}
                  value={activeConversation.title}
                  onChange={(e) => renameConversation(activeConversation.id, e.target.value)}
                  aria-label="Conversation title"
                />
                <button style={styles.dangerBtn} onClick={() => deleteConversation(activeConversation.id)} type="button">Delete</button>
              </div>
              <div style={styles.transcript}>
                {activeConversation.messages.map((message) => (
                  <div key={message.id} style={{ ...styles.transcriptBubble, alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', background: message.role === 'user' ? '#ffffff' : '#171b22', color: message.role === 'user' ? '#050505' : '#e5e7eb' }}>
                    <div style={styles.roleLabel}>{message.role === 'user' ? 'User' : 'Assistant'} | {formatDate(message.createdAt)}</div>
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState text="Select a conversation to view the transcript." />
          )}
        </section>
      </div>
    </div>
  );
}

function LogsPage({ logs }) {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Logs</h1>
      <p style={styles.pageSub}>Operational events generated by chats, settings, and dashboard data actions.</p>
      <section style={styles.panel}>
        <div style={styles.list}>
          {logs.map((log) => (
            <div key={log.id} style={styles.logItem}>
              <span style={styles.logType}>{log.type}</span>
              <span style={styles.logText}>{log.message}</span>
              <span style={styles.chatMeta}>{formatDate(log.createdAt)}</span>
            </div>
          ))}
          {logs.length === 0 && <EmptyState text="No logs yet." />}
        </div>
      </section>
    </div>
  );
}

function IntegrationsPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Integrations</h1>
      <p style={styles.pageSub}>Gemini is connected through the generated /api/autoverse-chat route and your AUTOVERSE_GEMINI_API_KEY.</p>
      <section style={styles.panel}><EmptyState text="Additional providers can be added in the generated API route when you are ready." /></section>
    </div>
  );
}

function DocumentationPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Documentation</h1>
      <p style={styles.pageSub}>The dashboard stores settings, logs, stats, and every conversation in browser localStorage for the installed app.</p>
      <section style={styles.panel}>
        <div style={styles.docGrid}>
          <DocItem title="Dashboard" text="Aggregates all conversations instead of only the active chat." />
          <DocItem title="History" text="Keeps a separate transcript for every chat created with New Chat." />
          <DocItem title="Settings" text="Updates chatbot behavior and model instructions live." />
          <DocItem title="Export" text="Copies the current dashboard data as JSON for backup or inspection." />
        </div>
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>About</h1>
      <p style={styles.pageSub}>Autoverse Agent CLI installs a Next.js chatbot, dashboard, history system, and Gemini API route into the project root.</p>
    </div>
  );
}

function Field({ label, value, placeholder, onChange }) {
  return (
    <label style={styles.fieldLabel}>{label}
      <input style={styles.input} value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }) {
  return (
    <label style={styles.fieldLabel}>{label}
      <textarea style={styles.textarea} rows={rows || 4} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Range({ label, min, max, step, value, onChange }) {
  return (
    <label style={styles.fieldLabel}>{label}: {value}
      <input style={styles.range} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label style={styles.toggleRow}>
      <span>{label}</span>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label style={styles.fieldLabel}>{label}
      <div style={styles.colorRow}>
        <input style={styles.colorInput} type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} />
        <input style={styles.input} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label style={styles.fieldLabel}>{label}
      <select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DocItem({ title, text }) {
  return <div style={styles.docItem}><strong>{title}</strong><span>{text}</span></div>;
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}

const styles = {
  root: { display: 'flex', height: '100vh', background: '#080a0e', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', overflow: 'hidden', color: '#e5e7eb' },
  sidebar: { background: '#0d1016', borderRight: '1px solid #20242b', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', overflow: 'hidden', flexShrink: 0 },
  brand: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px', borderBottom: '1px solid #20242b', gap: '8px' },
  brandLeft: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  brandLogo: { width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
  brandText: { color: '#ffffff', fontSize: '15px', fontWeight: '700' },
  brandSub: { color: '#7d8898', fontSize: '11px', marginTop: '2px' },
  iconBtn: { width: '30px', height: '30px', border: '1px solid #303642', background: '#11151c', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 8px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s ease', width: '100%' },
  navIconBox: { position: 'relative', flexShrink: 0, width: '32px', height: '28px', display: 'grid', placeItems: 'center' },
  dashboardGrid: { gridTemplateColumns: 'repeat(2, 8px)', gridTemplateRows: 'repeat(2, 8px)', gap: '2px', alignContent: 'center', justifyContent: 'center' },
  gridMark: { width: '6px', height: '6px', border: '1.5px solid', borderRadius: '2px', display: 'block' },
  sliderLine: { position: 'absolute', left: '7px', width: '18px', height: '2px', borderRadius: '999px' },
  sliderKnob: { position: 'absolute', width: '6px', height: '6px', border: '2px solid', borderRadius: '999px', background: '#0d1016' },
  clockCircle: { position: 'absolute', width: '17px', height: '17px', border: '2px solid', borderRadius: '999px' },
  clockHand: { position: 'absolute', width: '2px', borderRadius: '999px', transformOrigin: 'bottom center' },
  logLine: { position: 'absolute', left: '7px', height: '2px', borderRadius: '999px' },
  plugStem: { position: 'absolute', width: '14px', height: '12px', border: '2px solid', borderTop: '0', borderRadius: '0 0 6px 6px', top: '10px' },
  plugPin: { position: 'absolute', top: '5px', width: '2px', height: '7px', borderRadius: '999px' },
  bookMark: { position: 'absolute', width: '17px', height: '20px', border: '2px solid', borderRadius: '4px' },
  bookFold: { position: 'absolute', left: '15px', top: '5px', width: '2px', height: '18px', borderRadius: '999px' },
  infoCircle: { position: 'absolute', width: '18px', height: '18px', border: '2px solid', borderRadius: '999px' },
  infoDot: { position: 'absolute', top: '7px', width: '3px', height: '3px', borderRadius: '999px' },
  infoLine: { position: 'absolute', top: '12px', width: '2px', height: '7px', borderRadius: '999px' },
  logoutDoor: { position: 'absolute', left: '8px', top: '6px', width: '11px', height: '16px', border: '2px solid #fca5a5', borderRight: '0', borderRadius: '4px 0 0 4px' },
  logoutArrowLine: { position: 'absolute', left: '14px', top: '13px', width: '11px', height: '2px', background: '#fca5a5', borderRadius: '999px' },
  logoutArrowHead: { position: 'absolute', left: '20px', top: '9px', width: '7px', height: '7px', borderTop: '2px solid #fca5a5', borderRight: '2px solid #fca5a5', transform: 'rotate(45deg)' },
  navLabel: { whiteSpace: 'nowrap' },
  sidebarFooter: { padding: '16px 8px', borderTop: '1px solid #20242b' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #4c1d1d', cursor: 'pointer', fontSize: '14px', background: '#211214', color: '#fca5a5', width: '100%' },
  main: { flex: 1, overflow: 'auto', background: '#080a0e' },
  page: { padding: '34px', minWidth: 0 },
  headerRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' },
  pageTitle: { color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: 0 },
  pageSub: { color: '#8b95a5', fontSize: '14px', margin: 0 },
  statusPill: { border: '1px solid #1f5132', background: '#102619', color: '#86efac', borderRadius: '999px', padding: '8px 12px', fontSize: '12px', fontWeight: '700' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '18px' },
  statCard: { background: '#0d1016', border: '1px solid #20242b', borderRadius: '8px', padding: '18px', minHeight: '92px' },
  statValue: { color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: '0 0 8px 0', overflowWrap: 'anywhere' },
  statLabel: { color: '#8b95a5', fontSize: '12px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  twoCol: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: '18px' },
  panel: { background: '#0d1016', border: '1px solid #20242b', borderRadius: '8px', padding: '18px', minWidth: 0 },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' },
  panelTitle: { color: '#ffffff', fontSize: '16px', margin: 0, fontWeight: '700' },
  muted: { color: '#7d8898', fontSize: '12px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  chatListItem: { display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', textAlign: 'left', background: '#11151c', border: '1px solid #252b35', borderRadius: '8px', padding: '12px', color: '#e5e7eb', cursor: 'pointer' },
  chatTitle: { fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  chatMeta: { fontSize: '12px', color: '#8b95a5' },
  logItem: { display: 'grid', gridTemplateColumns: '90px minmax(0, 1fr) 170px', gap: '12px', alignItems: 'center', background: '#11151c', border: '1px solid #252b35', borderRadius: '8px', padding: '10px 12px' },
  logType: { color: '#93c5fd', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' },
  logText: { color: '#e5e7eb', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: '8px', color: '#cbd5e1', fontSize: '13px', marginTop: '14px' },
  input: { width: '100%', boxSizing: 'border-box', background: '#080a0e', border: '1px solid #303642', borderRadius: '6px', color: '#ffffff', padding: '10px 12px', fontSize: '13px', outline: 'none' },
  textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#080a0e', border: '1px solid #303642', borderRadius: '6px', color: '#ffffff', padding: '10px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: '#cbd5e1', fontSize: '13px', padding: '12px 0', borderBottom: '1px solid #20242b' },
  range: { width: '100%' },
  colorRow: { display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: '10px' },
  colorInput: { width: '48px', height: '40px', border: '1px solid #303642', background: '#080a0e', borderRadius: '6px', padding: '3px' },
  primaryBtn: { border: '1px solid #ffffff', background: '#ffffff', color: '#050505', borderRadius: '6px', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' },
  dangerBtn: { border: '1px solid #7f1d1d', background: '#2a1212', color: '#fca5a5', borderRadius: '6px', padding: '9px 12px', fontWeight: '700', cursor: 'pointer' },
  searchInput: { width: '260px', maxWidth: '100%', background: '#0d1016', border: '1px solid #303642', borderRadius: '6px', color: '#ffffff', padding: '10px 12px', fontSize: '13px', outline: 'none' },
  historyLayout: { display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: '18px', alignItems: 'start' },
  titleInput: { flex: 1, minWidth: 0, background: '#080a0e', border: '1px solid #303642', borderRadius: '6px', color: '#ffffff', padding: '10px 12px', fontSize: '15px', fontWeight: '700', outline: 'none' },
  transcript: { display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 210px)', overflow: 'auto', paddingRight: '4px' },
  transcriptBubble: { maxWidth: '82%', border: '1px solid #252b35', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' },
  roleLabel: { fontSize: '11px', opacity: 0.7, marginBottom: '6px', fontWeight: '700' },
  emptyState: { border: '1px dashed #303642', borderRadius: '8px', padding: '28px', color: '#8b95a5', textAlign: 'center', fontSize: '13px' },
  docGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  docItem: { display: 'flex', flexDirection: 'column', gap: '6px', background: '#11151c', border: '1px solid #252b35', borderRadius: '8px', padding: '14px', color: '#cbd5e1', fontSize: '13px' },
};
`;
}

module.exports = { dashboardTemplate };
