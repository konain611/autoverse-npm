const fs = require('fs');
const path = require('path');

function detect(cwd) {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return { framework: null, baseDir: null, envPrefix: null };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const isNext  = !!deps['next'];
  const isReact = !!deps['react'];

  if (!isNext && !isReact) {
    return { framework: null, baseDir: null, envPrefix: null };
  }

  const hasSrc = fs.existsSync(path.join(cwd, 'src'));
  const baseDir = hasSrc ? path.join(cwd, 'src') : cwd;

  if (isNext) {
    return { framework: 'next', baseDir, envPrefix: 'NEXT_PUBLIC' };
  }
  if (isReact) {
    if (deps['vite']) {
      return { framework: 'react', baseDir, envPrefix: 'VITE' };
    }
    if (deps['react-scripts']) {
      return { framework: 'react', baseDir, envPrefix: 'REACT_APP' };
    }
    // Default for modern React projects when exact tooling is unclear.
    return { framework: 'react', baseDir, envPrefix: 'VITE' };
  }
}

function saveEnv(cwd, envPrefix, agentName, username, password, geminiApiKey) {
  const envPath = path.join(cwd, '.env');

  const blockStart = '# Autoverse Dashboard Credentials (START)';
  const blockEnd = '# Autoverse Dashboard Credentials (END)';
  const browserGeminiKey =
    envPrefix === 'NEXT_PUBLIC' ? '' : `${envPrefix}_AUTOVERSE_GEMINI_API_KEY=${geminiApiKey}\n`;
  const newVars = `
${blockStart}
${envPrefix}_AUTOVERSE_AGENT_NAME=${agentName}
${envPrefix}_AUTOVERSE_USERNAME=${username}
${envPrefix}_AUTOVERSE_PASSWORD=${password}
${browserGeminiKey}AUTOVERSE_GEMINI_API_KEY=${geminiApiKey}
${blockEnd}
`;

  const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const withoutManagedBlock = existingEnv
    // Remove the new managed block format.
    .replace(/(?:\r?\n)?# Autoverse Dashboard Credentials \(START\)[\s\S]*?# Autoverse Dashboard Credentials \(END\)\r?\n?/g, '\n')
    // Remove legacy format from previous package versions.
    .replace(/(?:\r?\n)?# Autoverse Dashboard Credentials\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_AGENT_NAME=.*\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_USERNAME=.*\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_PASSWORD=.*(?:\r?\n(?:VITE|REACT_APP)_AUTOVERSE_GEMINI_API_KEY=.*)?(?:\r?\nAUTOVERSE_GEMINI_API_KEY=.*)?\r?\n?/g, '\n')
    .trimEnd();
  const separator = withoutManagedBlock.length > 0 ? '\n\n' : '';
  const nextEnv = `${withoutManagedBlock}${separator}${newVars.trimStart()}\n`;

  if (fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, nextEnv);
    console.log('  Credentials updated in your existing .env file.');
  } else {
    fs.writeFileSync(envPath, nextEnv);
    console.log('  .env file created with your credentials.');
  }
}

module.exports = { detect, saveEnv };
