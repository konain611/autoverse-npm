const fs = require('fs');
const path = require('path');
const { loginTemplate }     = require('./templates/login');
const { dashboardTemplate } = require('./templates/dashboard');

function setupNext(cwd, baseDir, agentName, username, password) {
  const hasAppRouter   = fs.existsSync(path.join(baseDir, 'app'));
  const hasPagesRouter = fs.existsSync(path.join(baseDir, 'pages'));

  if (hasAppRouter) {
    const loginDir     = path.join(baseDir, 'app', 'autoverse-dashboard');
    const dashboardDir = path.join(baseDir, 'app', 'autoverse-dashboard', 'home');

    fs.mkdirSync(loginDir,     { recursive: true });
    fs.mkdirSync(dashboardDir, { recursive: true });

    fs.writeFileSync(path.join(loginDir,     'page.js'), loginTemplate());
    fs.writeFileSync(path.join(dashboardDir, 'page.js'), dashboardTemplate());

    console.log('  Detected Next.js (App Router)');
  } else if (hasPagesRouter) {
    const pagesDir = path.join(baseDir, 'pages');

    fs.writeFileSync(path.join(pagesDir, 'autoverse-dashboard.js'),      loginTemplate());
    fs.writeFileSync(path.join(pagesDir, 'autoverse-dashboard-home.js'), dashboardTemplate());

    console.log('  Detected Next.js (Pages Router)');
  }

  console.log('\n  Done! Run your app and visit: http://localhost:3000/autoverse-dashboard\n');
}

module.exports = { setupNext };