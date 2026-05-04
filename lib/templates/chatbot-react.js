function reactChatbotTemplate() {
  return `
import { useState } from 'react';

const INITIAL_MESSAGES = [
  { id: 1, role: 'bot', text: 'Hey! I am your assistant. Need help with anything?' },
  { id: 2, role: 'user', text: 'Can you show recent updates?' },
  { id: 3, role: 'bot', text: 'Sure. Hook me to your API and I can respond live.' },
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
  const LOGO_PATH = '/autoverse-logo.png';

  return (
    <div style={styles.chatbotArea}>
      {chatOpen && (
        <section style={styles.chatbotPanel}>
          <div style={styles.chatbotHeader}>
            <div style={styles.chatbotTitleWrap}>
              <div style={styles.chatbotBadge}>
                <img src={LOGO_PATH} alt="Autoverse logo" style={styles.chatbotBadgeImage} />
              </div>
              <div>
                <h3 style={styles.chatbotTitle}>{AGENT_LABEL} Assistant</h3>
                <p style={styles.chatbotSubtitle}>React UI widget</p>
              </div>
            </div>
            <button
              style={styles.chatbotCloseBtn}
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              type="button"
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
        type="button"
      >
        <img src={LOGO_PATH} alt="Autoverse chatbot" style={styles.chatbotLauncherImage} />
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
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  chatbotPanel: {
    width: '360px',
    maxWidth: 'calc(100vw - 32px)',
    height: '500px',
    background: 'linear-gradient(180deg, #0f172a 0%, #0b1222 100%)',
    border: '1px solid #24324d',
    borderRadius: '18px',
    boxShadow: '0 24px 64px rgba(4, 13, 33, 0.55)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatbotHeader: {
    padding: '14px 14px 12px 14px',
    borderBottom: '1px solid #1f2d47',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#111a30',
  },
  chatbotTitleWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  chatbotBadge: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #67e8f9 0%, #60a5fa 100%)',
    color: '#031326',
    display: 'grid',
    placeItems: 'center',
    fontWeight: '700',
    fontSize: '12px',
  },
  chatbotBadgeImage: { width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' },
  chatbotTitle: { margin: 0, color: '#e6eeff', fontSize: '14px', lineHeight: 1.2 },
  chatbotSubtitle: { margin: '2px 0 0 0', color: '#8ea3ca', fontSize: '11px' },
  chatbotCloseBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid #2d3c59',
    background: 'transparent',
    color: '#a4b3d1',
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
    background: '#0c1528',
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
    color: '#d5e5ff',
    background: '#16233c',
    border: '1px solid #2a3b5b',
  },
  userBubble: {
    alignSelf: 'flex-end',
    color: '#031326',
    background: '#67e8f9',
    border: '1px solid #79edfb',
  },
  chatbotComposer: {
    padding: '12px',
    borderTop: '1px solid #1f2d47',
    background: '#111a30',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chatbotInput: {
    flex: 1,
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #2d3c59',
    background: '#0e182f',
    color: '#e7efff',
    fontSize: '13px',
    padding: '0 12px',
    outline: 'none',
  },
  chatbotSendBtn: {
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #67e8f9',
    background: '#67e8f9',
    color: '#031326',
    fontSize: '13px',
    fontWeight: '700',
    padding: '0 14px',
    cursor: 'pointer',
  },
  chatbotLauncher: {
    width: '56px',
    height: '56px',
    borderRadius: '999px',
    border: '1px solid #2d3c59',
    background: '#111a30',
    cursor: 'pointer',
    boxShadow: '0 12px 28px rgba(14, 91, 179, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    overflow: 'hidden',
  },
  chatbotLauncherActive: {
    border: '1px solid #4c648f',
  },
  chatbotLauncherImage: { width: '100%', height: '100%', objectFit: 'cover' },
};
`;
}

module.exports = { reactChatbotTemplate };
