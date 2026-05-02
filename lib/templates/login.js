function loginTemplate() {
  return `
'use client';
import { useState, useEffect } from 'react';

export default function AutoverseDashboardLogin() {
  const [user, setUser]         = useState('');
  const [pass, setPass]         = useState('');
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const AGENT_NAME =
    process.env.NEXT_PUBLIC_AUTOVERSE_AGENT_NAME ||
    process.env.VITE_AUTOVERSE_AGENT_NAME ||
    process.env.REACT_APP_AUTOVERSE_AGENT_NAME ||
    'Autoverse';
  const USERNAME =
    process.env.NEXT_PUBLIC_AUTOVERSE_USERNAME ||
    process.env.VITE_AUTOVERSE_USERNAME ||
    process.env.REACT_APP_AUTOVERSE_USERNAME;
  const PASSWORD =
    process.env.NEXT_PUBLIC_AUTOVERSE_PASSWORD ||
    process.env.VITE_AUTOVERSE_PASSWORD ||
    process.env.REACT_APP_AUTOVERSE_PASSWORD;

  function navigateTo(path, replace = false) {
    if (replace) {
      window.location.replace(path);
      return;
    }
    window.location.assign(path);
  }

  useEffect(() => {
    if (localStorage.getItem('autoverse_auth') === 'true') {
      navigateTo('/autoverse-dashboard/home', true);
    }
  }, []);

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  function handleLogin() {
    if (verifying) return;
    setVerifying(true);

    setTimeout(() => {
      if (user === USERNAME && pass === PASSWORD) {
        localStorage.setItem('autoverse_auth', 'true');
        setError('');
        navigateTo('/autoverse-dashboard/home');
      } else {
        setError('Invalid username or password. Please try again.');
        setVerifying(false);
      }
    }, 1000);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{AGENT_NAME}</h1>
        <p style={styles.subtitle}>Dashboard Login</p>

        <input
          style={styles.input}
          type="text"
          placeholder="Username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={verifying}
        />

        <div style={styles.passwordWrapper}>
          <input
            style={{ ...styles.input, ...styles.passwordInput }}
            type={showPass ? 'text' : 'password'}
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={verifying}
          />
          <button
            style={styles.eyeBtn}
            onClick={() => setShowPass(!showPass)}
            tabIndex={-1}
            type="button"
          >
            {showPass ? '🙈' : '👁'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{
            ...styles.button,
            opacity: verifying ? 0.6 : 1,
            cursor: verifying ? 'not-allowed' : 'pointer',
          }}
          onClick={handleLogin}
          disabled={verifying}
        >
          {verifying ? 'Verifying...' : 'Login'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#000000', fontFamily: 'sans-serif',
  },
  card: {
    background: '#111111', border: '1px solid #222222', borderRadius: '8px',
    padding: '48px 40px', width: '100%', maxWidth: '400px',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  title:    { color: '#ffffff', fontSize: '24px', margin: 0, textAlign: 'center', fontWeight: '600' },
  subtitle: { color: '#666666', fontSize: '14px', margin: 0, textAlign: 'center' },
  input: {
    background: '#000000', border: '1px solid #333333', borderRadius: '8px',
    padding: '12px 16px', color: '#ffffff', fontSize: '14px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  passwordWrapper: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  passwordInput: {
    paddingRight: '44px',
  },
  eyeBtn: {
    position: 'absolute', right: '12px', background: 'transparent',
    border: 'none', cursor: 'pointer', fontSize: '16px',
    color: '#666666', padding: '0', lineHeight: 1,
  },
  button: {
    background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px',
    padding: '14px', fontSize: '15px', marginTop: '8px', fontWeight: '600',
    transition: 'opacity 0.2s ease',
  },
  error: {
    color: '#ff0000', fontSize: '13px', margin: 0,
    background: '#1a1a1a', padding: '10px', borderRadius: '6px',
    border: '1px solid #2a0000',
  }
};
`;
}

module.exports = { loginTemplate };