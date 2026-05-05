const fs = require('fs');
const path = require('path');
const { loginTemplate }     = require('./templates/login');
const { dashboardTemplate } = require('./templates/dashboard');
const { chatbotTemplate }   = require('./templates/chatbot');

const CHATBOT_IMPORT = "import AutoverseChatbot from '../components/AutoverseChatbot';\n";
const LAYOUT_EXT = ['.js', '.jsx', '.tsx', '.mjs'];
const APP_EXT = [...LAYOUT_EXT];

function insertAfterDirective(code, insert) {
  const m = /^(['"])use client\1;\s*\r?\n/.exec(code);
  if (m) {
    return code.slice(0, m.index + m[0].length) + insert + code.slice(m.index + m[0].length);
  }
  const mSrv = /^(['"])use server\1;\s*\r?\n/.exec(code);
  if (mSrv) {
    return (
      code.slice(0, mSrv.index + mSrv[0].length) +
      insert +
      code.slice(mSrv.index + mSrv[0].length)
    );
  }
  return insert + code;
}

function injectBesideChildrenInBody(src) {
  const bodyMatch = /<body[^>]*>/i.exec(src);
  if (!bodyMatch) {
    return null;
  }
  const start = bodyMatch.index + bodyMatch[0].length;
  const afterBody = src.slice(start);
  const closeIdx = afterBody.indexOf('</body>');
  if (closeIdx === -1) {
    return null;
  }
  const inner = afterBody.slice(0, closeIdx);
  const updatedInner = inner.replace(
    /\{(\s*children\s*)\}/,
    '{$1}\n        <AutoverseChatbot />\n'
  );
  if (updatedInner === inner) {
    return null;
  }
  return (
    src.slice(0, start) +
    updatedInner +
    afterBody.slice(closeIdx)
  );
}

function injectAppLayout(layoutPath) {
  let code = fs.readFileSync(layoutPath, 'utf-8');
  const original = code;
  const importStr = CHATBOT_IMPORT.trim() + '\n';
  const hasComponent = /<AutoverseChatbot\b/.test(code);
  const hasImport = code.includes('components/AutoverseChatbot');

  if (hasComponent) {
    if (!hasImport) {
      code = insertAfterDirective(code, importStr);
      fs.writeFileSync(layoutPath, code);
    }
    return;
  }

  if (!hasImport) {
    code = insertAfterDirective(code, importStr);
  }

  let next = injectBesideChildrenInBody(code);

  if (!next || next === code) {
    const i = code.lastIndexOf('</body>');
    if (i !== -1) {
      next = `${code.slice(0, i)}        <AutoverseChatbot />\n${code.slice(i)}`;
    }
  }

  if (!next || next === code) {
    console.log(
      '  Warning: Could not inject AutoverseChatbot into app/layout. Add <AutoverseChatbot /> manually next to {children} in your root layout.'
    );
    if (code !== original) {
      fs.writeFileSync(layoutPath, code);
    }
    return;
  }

  fs.writeFileSync(layoutPath, next);
}

function findAppRootLayout(baseDir) {
  for (const ext of LAYOUT_EXT) {
    const p = path.join(baseDir, 'app', `layout${ext}`);
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Wrap `<Component {...pageProps} />` with a fragment + AutoverseChatbot.
 */
function injectPagesApp(appPath) {
  let code = fs.readFileSync(appPath, 'utf-8');
  const importStr = CHATBOT_IMPORT.trim() + '\n';

  if (code.includes('<AutoverseChatbot')) {
    return;
  }

  if (!code.includes('components/AutoverseChatbot')) {
    code = insertAfterDirective(code, importStr);
  }

  const single = /<Component\s*\{\.\.\.\s*pageProps\s*\}\s*\/>/;
  let next;

  if (single.test(code)) {
    next = code.replace(
      single,
      '<>\n          <Component {...pageProps} />\n          <AutoverseChatbot />\n        </>'
    );
  } else {
    const loose = /<Component\b[^>]*\{\.\.\.\s*pageProps\s*\}[^/]*\/\>/;
    next = loose.test(code)
      ? code.replace(
          loose,
          (match) =>
            `<>\n          ${match}\n          <AutoverseChatbot />\n        </>`
        )
      : code;
  }

  if (next === code) {
    console.log(
      '  Warning: Could not inject AutoverseChatbot into pages/_app. Add <AutoverseChatbot /> beside your root content in pages/_app.'
    );
    fs.writeFileSync(appPath, code);
    return;
  }

  fs.writeFileSync(appPath, next);
}

function findPagesApp(baseDir) {
  for (const ext of APP_EXT) {
    const p = path.join(baseDir, 'pages', `_app${ext}`);
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function writeAutoverseChatbot(baseDir) {
  const componentsDir = path.join(baseDir, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(path.join(componentsDir, 'AutoverseChatbot.js'), chatbotTemplate());
}

function writeAutoverseLogo(cwd) {
  const sourceLogo = path.join(__dirname, '..', 'autoverse-logo.png');
  if (!fs.existsSync(sourceLogo)) {
    console.log('  Warning: autoverse-logo.png not found in package root. Skipping logo copy.');
    return;
  }
  const publicDir = path.join(cwd, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(sourceLogo, path.join(publicDir, 'autoverse-logo.png'));
}

function nextAppApiRouteTemplate() {
  return `export async function POST(req) {
  try {
    const { messages, settings } = await req.json();
    const apiKey =
      process.env.AUTOVERSE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: 'Missing Gemini API key in .env' },
        { status: 500 }
      );
    }

    const safeMessages = Array.isArray(messages) ? messages : [];
    const latest = safeMessages.slice(-20);
    const contents = latest.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }],
    }));

    const safeSettings = settings && typeof settings === 'object' ? settings : {};
    const temperature = Number.isFinite(Number(safeSettings.temperature))
      ? Math.min(Math.max(Number(safeSettings.temperature), 0), 2)
      : 0.7;
    const maxOutputTokens = Number.isFinite(Number(safeSettings.maxOutputTokens))
      ? Math.min(Math.max(Number(safeSettings.maxOutputTokens), 64), 2048)
      : 512;
    const systemInstruction =
      typeof safeSettings.systemInstruction === 'string' && safeSettings.systemInstruction.trim()
        ? safeSettings.systemInstruction.trim().slice(0, 4000)
        : 'You are the helpful Autoverse dashboard assistant. Keep responses short, useful, and professional.';

    const result = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey.trim()}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction,
              },
            ],
          },
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
      }
    );

    if (!result.ok) {
      const errorBody = await result.text();
      return Response.json(
        { error: 'Gemini request failed', details: errorBody },
        { status: 500 }
      );
    }

    const data = await result.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I could not generate a response right now.';

    return Response.json({ reply });
  } catch (err) {
    return Response.json(
      { error: 'Unexpected server error', details: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
`;
}

function nextPagesApiRouteTemplate() {
  return `export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, settings } = req.body || {};
    const apiKey =
      process.env.AUTOVERSE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing Gemini API key in .env' });
    }

    const safeMessages = Array.isArray(messages) ? messages : [];
    const latest = safeMessages.slice(-20);
    const contents = latest.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }],
    }));

    const safeSettings = settings && typeof settings === 'object' ? settings : {};
    const temperature = Number.isFinite(Number(safeSettings.temperature))
      ? Math.min(Math.max(Number(safeSettings.temperature), 0), 2)
      : 0.7;
    const maxOutputTokens = Number.isFinite(Number(safeSettings.maxOutputTokens))
      ? Math.min(Math.max(Number(safeSettings.maxOutputTokens), 64), 2048)
      : 512;
    const systemInstruction =
      typeof safeSettings.systemInstruction === 'string' && safeSettings.systemInstruction.trim()
        ? safeSettings.systemInstruction.trim().slice(0, 4000)
        : 'You are the helpful Autoverse dashboard assistant. Keep responses short, useful, and professional.';

    const result = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey.trim()}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction,
              },
            ],
          },
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
      }
    );

    if (!result.ok) {
      const errorBody = await result.text();
      return res.status(500).json({ error: 'Gemini request failed', details: errorBody });
    }

    const data = await result.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I could not generate a response right now.';

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: 'Unexpected server error',
      details: err?.message || 'Unknown error',
    });
  }
}
`;
}

function writeNextChatApi(baseDir, isAppRouter) {
  if (isAppRouter) {
    const routeDir = path.join(baseDir, 'app', 'api', 'autoverse-chat');
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'route.js'), nextAppApiRouteTemplate());
    return;
  }
  const routeDir = path.join(baseDir, 'pages', 'api');
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'autoverse-chat.js'), nextPagesApiRouteTemplate());
}

function setupNext(cwd, baseDir, agentName, username, password) {
  const hasAppRouter   = fs.existsSync(path.join(baseDir, 'app'));
  const hasPagesRouter = fs.existsSync(path.join(baseDir, 'pages'));

  if (hasAppRouter) {
    writeAutoverseLogo(cwd);
    writeAutoverseChatbot(baseDir);
    writeNextChatApi(baseDir, true);

    const layoutPath = findAppRootLayout(baseDir);
    if (layoutPath) {
      injectAppLayout(layoutPath);
    } else {
      console.log(
        '  Warning: No app/layout file found under app/. Skipping chatbot injection. Create app/layout.tsx and render <AutoverseChatbot /> next to {children}, or use the Components/AutoverseChatbot export.'
      );
    }

    const loginDir     = path.join(baseDir, 'app', 'autoverse-dashboard');
    const dashboardDir = path.join(baseDir, 'app', 'autoverse-dashboard', 'home');

    fs.mkdirSync(loginDir, { recursive: true });
    fs.mkdirSync(dashboardDir, { recursive: true });

    fs.writeFileSync(path.join(loginDir, 'page.js'), loginTemplate());
    fs.writeFileSync(path.join(dashboardDir, 'page.js'), dashboardTemplate());

    console.log('  Detected Next.js (App Router)');
  } else if (hasPagesRouter) {
    writeAutoverseLogo(cwd);
    writeAutoverseChatbot(baseDir);
    writeNextChatApi(baseDir, false);

    const appPath = findPagesApp(baseDir);
    if (appPath) {
      injectPagesApp(appPath);
    } else {
      console.log(
        '  Warning: No pages/_app file found. Add <AutoverseChatbot /> to your custom App component, or create pages/_app.js that renders it alongside pages.'
      );
    }

    const pagesDir = path.join(baseDir, 'pages');

    fs.writeFileSync(path.join(pagesDir, 'autoverse-dashboard.js'), loginTemplate());
    fs.writeFileSync(path.join(pagesDir, 'autoverse-dashboard-home.js'), dashboardTemplate());

    console.log('  Detected Next.js (Pages Router)');
  }

  console.log('\n  Done! Run your app and visit: http://localhost:3000/autoverse-dashboard\n');
}

module.exports = { setupNext };
