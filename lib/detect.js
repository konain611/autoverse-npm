const fs = require('fs');
const path = require('path');

function detect(cwd) {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return { framework: null, baseDir: null };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const isNext  = !!deps['next'];
  const isReact = !!deps['react'];

  if (!isNext && !isReact) {
    return { framework: null, baseDir: null };
  }

  const hasSrc = fs.existsSync(path.join(cwd, 'src'));
  const baseDir = hasSrc ? path.join(cwd, 'src') : cwd;

  if (isNext)  return { framework: 'next',  baseDir };
  if (isReact) return { framework: 'react', baseDir };
}

function saveEnv(cwd, agentName, username, password) {
  const envPath = path.join(cwd, '.env');

  const newVars = `
# Autoverse Dashboard Credentials
NEXT_PUBLIC_AUTOVERSE_AGENT_NAME=${agentName}
NEXT_PUBLIC_AUTOVERSE_USERNAME=${username}
NEXT_PUBLIC_AUTOVERSE_PASSWORD=${password}
`;

  if (fs.existsSync(envPath)) {
    fs.appendFileSync(envPath, newVars);
    console.log('  Credentials added to your existing .env file.');
  } else {
    fs.writeFileSync(envPath, newVars.trimStart());
    console.log('  .env file created with your credentials.');
  }
}

module.exports = { detect, saveEnv };