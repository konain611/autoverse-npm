function chatbotTemplate() {
  return `
'use client';
import { useState } from 'react';

const INITIAL_MESSAGES = [
  { id: 1, role: 'bot', text: 'Hi! I am your assistant. How can I help you today?' },
  { id: 2, role: 'user', text: 'Show me the latest system activity.' },
  { id: 3, role: 'bot', text: 'Sure. Activity insights will appear here once connected.' },
];

export default function AutoverseChatbot() {
  const AGENT_LABEL =
    process.env.NEXT_PUBLIC_AUTOVERSE_AGENT_NAME ||
    process.env.VITE_AUTOVERSE_AGENT_NAME ||
    process.env.REACT_APP_AUTOVERSE_AGENT_NAME ||
    'Autoverse';

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages] = useState(INITIAL_MESSAGES);

  return (
    <div style={styles.chatbotArea}>
      {chatOpen && (
        <section style={styles.chatbotPanel}>
          <div style={styles.chatbotHeader}>
            <div style={styles.chatbotTitleWrap}>
              <div style={styles.chatbotBadge}>AI</div>
              <div>
                <h3 style={styles.chatbotTitle}>{AGENT_LABEL} Assistant</h3>
                <p style={styles.chatbotSubtitle}>Typically replies instantly</p>
              </div>
            </div>
            <button
              style={styles.chatbotCloseBtn}
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div style={styles.chatbotMessages}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  ...styles.chatBubble,
                  ...(message.role === 'user' ? styles.userBubble : styles.botBubble),
                }}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div style={styles.chatbotComposer}>
            <input
              style={styles.chatbotInput}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
            />
            <button style={styles.chatbotSendBtn} type="button">
              Send
            </button>
          </div>
        </section>
      )}

      <button
        style={{
          ...styles.chatbotLauncher,
          ...(chatOpen ? styles.chatbotLauncherActive : null),
        }}
        onClick={() => setChatOpen((prev) => !prev)}
        aria-label={chatOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        <span style={styles.chatbotLauncherIcon}>✦</span>
      </button>
    </div>
  );
}

const styles = {
  chatbotArea: {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
    fontFamily: 'sans-serif',
  },
  chatbotPanel: {
    width: '360px',
    maxWidth: 'calc(100vw - 32px)',
    height: '480px',
    background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
    border: '1px solid #242424',
    borderRadius: '18px',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatbotHeader: {
    padding: '14px 14px 12px 14px',
    borderBottom: '1px solid #1d1d1d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0f0f0f',
  },
  chatbotTitleWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  chatbotBadge: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #ffffff 0%, #bdbdbd 100%)',
    color: '#000000',
    display: 'grid',
    placeItems: 'center',
    fontWeight: '700',
    fontSize: '12px',
  },
  chatbotTitle: { margin: 0, color: '#ffffff', fontSize: '14px', lineHeight: 1.2 },
  chatbotSubtitle: { margin: '2px 0 0 0', color: '#6f6f6f', fontSize: '11px' },
  chatbotCloseBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    background: 'transparent',
    color: '#8f8f8f',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
  },
  chatbotMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: '#0b0b0b',
  },
  chatBubble: {
    maxWidth: '85%',
    fontSize: '13px',
    lineHeight: 1.45,
    borderRadius: '14px',
    padding: '10px 12px',
  },
  botBubble: {
    alignSelf: 'flex-start',
    color: '#d8d8d8',
    background: '#171717',
    border: '1px solid #232323',
  },
  userBubble: {
    alignSelf: 'flex-end',
    color: '#000000',
    background: '#ffffff',
    border: '1px solid #e8e8e8',
  },
  chatbotComposer: {
    padding: '12px',
    borderTop: '1px solid #1d1d1d',
    background: '#0f0f0f',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chatbotInput: {
    flex: 1,
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #2a2a2a',
    background: '#0a0a0a',
    color: '#ffffff',
    fontSize: '13px',
    padding: '0 12px',
    outline: 'none',
  },
  chatbotSendBtn: {
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #ffffff',
    background: '#ffffff',
    color: '#000000',
    fontSize: '13px',
    fontWeight: '600',
    padding: '0 14px',
    cursor: 'pointer',
  },
  chatbotLauncher: {
    width: '56px',
    height: '56px',
    borderRadius: '999px',
    border: '1px solid #2f2f2f',
    background: 'linear-gradient(145deg, #ffffff 0%, #cbcbcb 100%)',
    color: '#000000',
    cursor: 'pointer',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
    display: 'grid',
    placeItems: 'center',
  },
  chatbotLauncherActive: {
    background: 'linear-gradient(145deg, #f6f6f6 0%, #9f9f9f 100%)',
  },
  chatbotLauncherIcon: { fontSize: '22px', lineHeight: 1 },
};
`;
}

module.exports = { chatbotTemplate };
