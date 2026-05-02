const fs = require('fs');
const path = require('path');
const { loginTemplate } = require('./templates/login');
const { dashboardTemplate } = require('./templates/dashboard');

function findExistingFile(cwd, candidates) {
  for (const relativePath of candidates) {
    const absolutePath = path.join(cwd, relativePath);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
}

function injectRouteGate(entryFilePath) {
  let content = fs.readFileSync(entryFilePath, 'utf-8');

  if (content.includes('AUTOVERSE_ROUTE_GATE')) {
    return true;
  }

  const appImportRegex = /import\s+App\s+from\s+['"][^'"]+['"];?/;
  if (!appImportRegex.test(content)) {
    return false;
  }

  const autoverseImports = `import AutoverseDashboard from './pages/AutoverseDashboard';\nimport AutoverseDashboardHome from './pages/AutoverseDashboardHome';`;
  content = content.replace(appImportRegex, (match) => `${match}\n${autoverseImports}`);

  const gateBlock = `
function AutoverseRouteGate() {
  const pathName = window.location.pathname;
  if (pathName === '/autoverse-dashboard') return <AutoverseDashboard />;
  if (pathName === '/autoverse-dashboard/home') return <AutoverseDashboardHome />;
  return <App />;
}
`;
  const importLines = content.match(/^(import[^\n]*\n)+/);
  if (importLines) {
    content = `${importLines[0]}\n${gateBlock}\n${content.slice(importLines[0].length)}`;
  } else {
    content = `${gateBlock}\n${content}`;
  }

  if (content.includes('<App />')) {
    content = content.replace('<App />', '/* AUTOVERSE_ROUTE_GATE */ <AutoverseRouteGate />');
  } else if (content.includes('<App/>')) {
    content = content.replace('<App/>', '/* AUTOVERSE_ROUTE_GATE */ <AutoverseRouteGate />');
  } else {
    return false;
  }

  fs.writeFileSync(entryFilePath, content);
  return true;
}

function setupReact(cwd) {
  const dir = path.join(cwd, 'src', 'pages');
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'AutoverseDashboard.jsx'),     loginTemplate());
  fs.writeFileSync(path.join(dir, 'AutoverseDashboardHome.jsx'), dashboardTemplate());

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