#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n Welcome to Autoverse Agent CLI!\n');

rl.question('\n Enter Your Name:  ', (name) => {
  console.log(`\n Thank you, ${name}! Setting up your Autoverse Dashboard...\n`);

  const cwd = process.cwd(); 

  // --- Detect framework ---
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ No package.json found. Please run this inside a Next.js or React project folder.\n');
    rl.close();
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const isNext = !!deps['next'];
  const isReact = !!deps['react'];

  if (!isNext && !isReact) {
    console.log('❌ This does not look like a Next.js or React project. Exiting.\n');
    rl.close();
    process.exit(1);
  }

  if (isNext) {
    setupNext(cwd, name);
  } else if (isReact) {
    setupReact(cwd, name);
  }

  rl.close();
});


// ─────────────────────────────────────────
// NEXT.JS SETUP
// ─────────────────────────────────────────
function setupNext(cwd, name) {
  // Detect if user is using src/ folder or not
  const hasSrc = fs.existsSync(path.join(cwd, 'src'));

  const baseDir = hasSrc ? path.join(cwd, 'src') : cwd;

  const hasAppRouter = fs.existsSync(path.join(baseDir, 'app'));
  const hasPagesRouter = fs.existsSync(path.join(baseDir, 'pages'));

  if (hasAppRouter) {
    const dir = path.join(baseDir, 'app', 'autoverse-dashboard');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'page.js'), nextAppPage());
    console.log('✅ Detected Next.js (App Router)');
  } else if (hasPagesRouter) {
    const dir = path.join(baseDir, 'pages');
    fs.writeFileSync(path.join(dir, 'autoverse-dashboard.js'), nextPagesPage());
    console.log('✅ Detected Next.js (Pages Router)');
  } else {
    console.log('⚠️  Could not detect router type. Creating in app folder.');
    const dir = path.join(baseDir, 'app', 'autoverse-dashboard');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'page.js'), nextAppPage());
  }

  console.log('\n🎉 Done! Visit http://localhost:3000/autoverse-dashboard in your browser.\n');
}


// ─────────────────────────────────────────
// REACT (VITE/CRA) SETUP
// ─────────────────────────────────────────
function setupReact(cwd, name) {
  // Create src/pages/AutoverseDashboard.jsx
  const dir = path.join(cwd, 'src', 'pages');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'AutoverseDashboard.jsx'), reactPage());

  console.log('✅ Detected React app');
  console.log('\n🎉 Done! Component created at src/pages/AutoverseDashboard.jsx');
  console.log('👉 Add this route in your App.jsx:\n');
  console.log('   import AutoverseDashboard from "./pages/AutoverseDashboard"');
  console.log('   <Route path="/autoverse-dashboard" element={<AutoverseDashboard />} />\n');
}


// ─────────────────────────────────────────
// PAGE TEMPLATES
// ─────────────────────────────────────────
function nextAppPage() {
  return `export default function AutoverseDashboard() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1>Hello World</h1>
    </div>
  );
}
`;
}

function nextPagesPage() {
  return `export default function AutoverseDashboard() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1>Hello World</h1>
    </div>
  );
}
`;
}

function reactPage() {
  return `export default function AutoverseDashboard() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h1>Hello World</h1>
    </div>
  );
}
`;
}