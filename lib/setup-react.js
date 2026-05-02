const fs = require('fs');
const path = require('path');
const { loginTemplate } = require('./templates/login');
const { dashboardTemplate } = require('./templates/dashboard');

function setupReact(cwd, agentName, username, password) {
  const dir = path.join(cwd, 'src', 'pages');
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'AutoverseDashboard.jsx'),     loginTemplate(agentName, username, password));
  fs.writeFileSync(path.join(dir, 'AutoverseDashboardHome.jsx'), dashboardTemplate(agentName));

  console.log('   Detected React app');
  console.log('\n   Done! Add these routes in your App.jsx:\n');
  console.log('     import AutoverseDashboard     from "./pages/AutoverseDashboard"');
  console.log('     import AutoverseDashboardHome from "./pages/AutoverseDashboardHome"');
  console.log('     <Route path="/autoverse-dashboard"      element={<AutoverseDashboard />} />');
  console.log('     <Route path="/autoverse-dashboard/home" element={<AutoverseDashboardHome />} />\n');
}

module.exports = { setupReact };