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

function setupNext(cwd, baseDir, agentName, username, password) {
  const hasAppRouter   = fs.existsSync(path.join(baseDir, 'app'));
  const hasPagesRouter = fs.existsSync(path.join(baseDir, 'pages'));

  if (hasAppRouter) {
    writeAutoverseChatbot(baseDir);

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
    writeAutoverseChatbot(baseDir);

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