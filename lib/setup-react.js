const fs = require('fs');
const path = require('path');
const { loginTemplate } = require('./templates/login');
const { dashboardTemplate } = require('./templates/dashboard');
const { reactChatbotTemplate } = require('./templates/chatbot-react');

function findExistingFile(cwd, candidates) {
  for (const relativePath of candidates) {
    const absolutePath = path.join(cwd, relativePath);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
}

function replaceLastOccurrence(text, search, replacement) {
  const idx = text.lastIndexOf(search);
  if (idx === -1) return null;
  return text.slice(0, idx) + replacement + text.slice(idx + search.length);
}

function injectRootGateUsage(content) {
  if (content.includes('/* AUTOVERSE_ROUTE_GATE */ <AutoverseRouteGate />')) {
    return content;
  }
  let next = replaceLastOccurrence(content, '<App />', '/* AUTOVERSE_ROUTE_GATE */ <AutoverseRouteGate />');
  if (!next) {
    next = replaceLastOccurrence(content, '<App/>', '/* AUTOVERSE_ROUTE_GATE */ <AutoverseRouteGate />');
  }
  return next;
}

function injectRouteGate(entryFilePath) {
  let content = fs.readFileSync(entryFilePath, 'utf-8');

  if (content.includes('AUTOVERSE_ROUTE_GATE') && content.includes('AutoverseChatbot')) {
    return true;
  }

  const appImportRegex = /import\s+App\s+from\s+['"][^'"]+['"];?/;
  if (!appImportRegex.test(content)) {
    return false;
  }

  content = content.replace(appImportRegex, (match) => {
    let next = match;
    if (!content.includes("from './pages/AutoverseDashboard'")) {
      next += `\nimport AutoverseDashboard from './pages/AutoverseDashboard';`;
    }
    if (!content.includes("from './pages/AutoverseDashboardHome'")) {
      next += `\nimport AutoverseDashboardHome from './pages/AutoverseDashboardHome';`;
    }
    if (!content.includes("from './components/AutoverseChatbot'")) {
      next += `\nimport AutoverseChatbot from './components/AutoverseChatbot';`;
    }
    return next;
  });

  const gateBlock = `
function AutoverseRouteGate() {
  const pathName = window.location.pathname;
  if (pathName === '/autoverse-dashboard') {
    return (
      <>
        <AutoverseDashboard />
        <AutoverseChatbot />
      </>
    );
  }
  if (pathName === '/autoverse-dashboard/home') {
    return (
      <>
        <AutoverseDashboardHome />
        <AutoverseChatbot />
      </>
    );
  }
  return (
    <>
      <App />
      <AutoverseChatbot />
    </>
  );
}
`;

  if (!content.includes('function AutoverseRouteGate()')) {
    const importLines = content.match(/^(import[^\n]*\n)+/);
    if (importLines) {
      content = `${importLines[0]}\n${gateBlock}\n${content.slice(importLines[0].length)}`;
    } else {
      content = `${gateBlock}\n${content}`;
    }
  } else {
    content = content
      .replace(/if\s*\(pathName\s*===\s*['"]\/autoverse-dashboard['"]\)\s*return\s*<AutoverseDashboard\s*\/>;/, `if (pathName === '/autoverse-dashboard') {\n    return (\n      <>\n        <AutoverseDashboard />\n        <AutoverseChatbot />\n      </>\n    );\n  }`)
      .replace(/if\s*\(pathName\s*===\s*['"]\/autoverse-dashboard\/home['"]\)\s*return\s*<AutoverseDashboardHome\s*\/>;/, `if (pathName === '/autoverse-dashboard/home') {\n    return (\n      <>\n        <AutoverseDashboardHome />\n        <AutoverseChatbot />\n      </>\n    );\n  }`)
      .replace(/return\s*<App\s*\/>;/, `return (\n    <>\n      <App />\n      <AutoverseChatbot />\n    </>\n  );`);
  }

  const withRootGate = injectRootGateUsage(content);
  if (!withRootGate) {
    return false;
  }
  content = withRootGate;

  fs.writeFileSync(entryFilePath, content);
  return true;
}

function writeAutoverseLogo(cwd) {
  const sourceLogo = path.join(__dirname, '..', 'autoverse-logo.png');
  if (!fs.existsSync(sourceLogo)) {
    console.log('   Warning: autoverse-logo.png not found in package root. Skipping logo copy.');
    return;
  }
  const publicDir = path.join(cwd, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(sourceLogo, path.join(publicDir, 'autoverse-logo.png'));
}

function setupReact(cwd) {
  const dir = path.join(cwd, 'src', 'pages');
  const componentsDir = path.join(cwd, 'src', 'components');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  writeAutoverseLogo(cwd);

  fs.writeFileSync(path.join(dir, 'AutoverseDashboard.jsx'),     loginTemplate());
  fs.writeFileSync(path.join(dir, 'AutoverseDashboardHome.jsx'), dashboardTemplate());
  fs.writeFileSync(path.join(componentsDir, 'AutoverseChatbot.jsx'), reactChatbotTemplate());

  const entryFile = findExistingFile(cwd, [
    'src/main.jsx',
    'src/main.js',
    'src/main.tsx',
    'src/main.ts',
    'src/index.jsx',
    'src/index.js',
    'src/index.tsx',
    'src/index.ts',
  ]);
  const routeInjected = entryFile ? injectRouteGate(entryFile) : false;

  console.log('   Detected React app');
  if (routeInjected) {
    console.log('   React routes auto-configured.');
    console.log('\n   Done! Visit:');
    console.log('     /autoverse-dashboard');
    console.log('     /autoverse-dashboard/home\n');
  } else {
    console.log('\n   Could not auto-configure routes in your entry file.');
    console.log('   Your dashboard pages were still created in src/pages.\n');
  }
}

module.exports = { setupReact };