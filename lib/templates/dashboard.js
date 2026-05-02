function dashboardTemplate() {
  return `
'use client';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { key: 'dashboard',      label: 'Dashboard'      },
  { key: 'agent-settings', label: 'Agent Settings' },
  { key: 'history',        label: 'History'        },
  { key: 'logs',           label: 'Logs'           },
  { key: 'integrations',   label: 'Integrations'   },
  { key: 'documentation',  label: 'Documentation'  },
  { key: 'about',          label: 'About'          },
];

const NAV_ICONS = {
  'dashboard'      : '▣',
  'agent-settings' : '◈',
  'history'        : '◷',
  'logs'           : '≡',
  'integrations'   : '⊕',
  'documentation'  : '□',
  'about'          : '◉',
};

export default function AutoverseDashboardHome() {
  const AGENT_NAME =
    process.env.NEXT_PUBLIC_AUTOVERSE_AGENT_NAME ||
    process.env.VITE_AUTOVERSE_AGENT_NAME ||
    process.env.REACT_APP_AUTOVERSE_AGENT_NAME ||
    'Autoverse';
  const [authorized, setAuthorized]   = useState(false);
  const [activePage, setActivePage]   = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function navigateTo(path, replace = false) {
    if (replace) {
      window.location.replace(path);
      return;
    }
    window.location.assign(path);
  }

  useEffect(() => {
    if (localStorage.getItem('autoverse_auth') !== 'true') {
      navigateTo('/autoverse-dashboard', true);
    } else {
      setAuthorized(true);
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('autoverse_auth');
    navigateTo('/autoverse-dashboard', true);
  }

  if (!authorized) return null;

  return (
    <div style={styles.root}>
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? '240px' : '60px' }}>
        <div style={styles.brand}>
          {sidebarOpen && <span style={styles.brandText}>Autoverse</span>}
          <button style={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              style={{
                ...styles.navItem,
                background: activePage === item.key ? '#ffffff' : 'transparent',
                color:      activePage === item.key ? '#000000' : '#666666',
              }}
              onClick={() => setActivePage(item.key)}
            >
              <span style={styles.navIcon}>{NAV_ICONS[item.key]}</span>
              {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <span style={styles.navIcon}>↩</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <PageContent activePage={activePage} agentName={AGENT_NAME} />
      </main>
    </div>
  );
}

function PageContent({ activePage, agentName }) {
  switch (activePage) {
    case 'dashboard':
      return (
        <div style={styles.page}>
          <h1 style={styles.pageTitle}>{agentName} Dashboard</h1>
          <p style={styles.pageSub}>Welcome back. Your agent is ready.</p>
          <div style={styles.statsRow}>
            {[
              { label: 'Status',      value: 'Active'   },
              { label: 'Uptime',      value: '100%'     },
              { label: 'Tasks Run',   value: '0'        },
              { label: 'Last Active', value: 'Just now' },
            ].map((stat) => (
              <div key={stat.label} style={styles.statCard}>
                <p style={styles.statValue}>{stat.value}</p>
                <p style={styles.statLabel}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'agent-settings':
      return <div style={styles.page}><h1 style={styles.pageTitle}>Agent Settings</h1><p style={styles.pageSub}>Configure your agent. Coming soon.</p></div>;
    case 'history':
      return <div style={styles.page}><h1 style={styles.pageTitle}>History</h1><p style={styles.pageSub}>Your agent activity history will appear here.</p></div>;
    case 'logs':
      return <div style={styles.page}><h1 style={styles.pageTitle}>Logs</h1><p style={styles.pageSub}>System logs will appear here.</p></div>;
    case 'integrations':
      return <div style={styles.page}><h1 style={styles.pageTitle}>Integrations</h1><p style={styles.pageSub}>Connect your agent to external services. Coming soon.</p></div>;
    case 'documentation':
      return <div style={styles.page}><h1 style={styles.pageTitle}>Documentation</h1><p style={styles.pageSub}>Guides and references will appear here.</p></div>;
    case 'about':
      return <div style={styles.page}><h1 style={styles.pageTitle}>About</h1><p style={styles.pageSub}>Autoverse Agent CLI — Built with passion.</p></div>;
    default:
      return null;
  }
}

const styles = {
  root: { display: 'flex', height: '100vh', background: '#000000', fontFamily: 'sans-serif', overflow: 'hidden' },
  sidebar: { background: '#0a0a0a', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', overflow: 'hidden', flexShrink: 0 },
  brand: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px', borderBottom: '1px solid #1a1a1a' },
  brandText: { color: '#ffffff', fontSize: '16px', fontWeight: '600' },
  toggleBtn: { background: 'transparent', border: '1px solid #222222', color: '#666666', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 8px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s ease', width: '100%' },
  navIcon: { fontSize: '16px', flexShrink: 0, width: '20px', textAlign: 'center' },
  navLabel: { whiteSpace: 'nowrap' },
  sidebarFooter: { padding: '16px 8px', borderTop: '1px solid #1a1a1a' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', background: 'transparent', color: '#444444', width: '100%' },
  main: { flex: 1, overflow: 'auto', background: '#000000' },
  page: { padding: '48px' },
  pageTitle: { color: '#ffffff', fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0' },
  pageSub: { color: '#444444', fontSize: '14px', margin: '0 0 40px 0' },
  statsRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  statCard: { background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '24px 32px', minWidth: '140px' },
  statValue: { color: '#ffffff', fontSize: '24px', fontWeight: '600', margin: '0 0 4px 0' },
  statLabel: { color: '#444444', fontSize: '12px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
};
`;
}

module.exports = { dashboardTemplate };