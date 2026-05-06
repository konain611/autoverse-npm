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

const FALLBACK_PROVIDER = {
  id: 'gemini',
  envKey: 'GEMINI_API_KEY',
  model: 'gemini-2.0-flash',
};

function saveEnv(cwd, envPrefix, agentName, username, password, provider, apiKey) {
  const envPath = path.join(cwd, '.env');

  const blockStart = '# Autoverse Dashboard Credentials (START)';
  const blockEnd = '# Autoverse Dashboard Credentials (END)';
  const selectedProvider =
    provider && typeof provider === 'object' ? { ...FALLBACK_PROVIDER, ...provider } : FALLBACK_PROVIDER;
  const cleanApiKey = String(apiKey || '').trim();
  const publicRuntimeVars = `${envPrefix}_AUTOVERSE_AI_PROVIDER=${selectedProvider.id}\n${envPrefix}_AUTOVERSE_AI_MODEL=${selectedProvider.model}`;
  const publicProviderKey =
    envPrefix === 'NEXT_PUBLIC' ? '' : `\n${envPrefix}_${selectedProvider.envKey}=${cleanApiKey}`;
  const newVars = `
${blockStart}
${envPrefix}_AUTOVERSE_AGENT_NAME=${agentName}
${envPrefix}_AUTOVERSE_USERNAME=${username}
${envPrefix}_AUTOVERSE_PASSWORD=${password}
${publicRuntimeVars}${publicProviderKey}
AUTOVERSE_AI_PROVIDER=${selectedProvider.id}
AUTOVERSE_AI_MODEL=${selectedProvider.model}
${selectedProvider.envKey}=${cleanApiKey}
${blockEnd}
`;

  const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const withoutManagedBlock = existingEnv
    // Remove the new managed block format.
    .replace(/(?:\r?\n)?# Autoverse Dashboard Credentials \(START\)[\s\S]*?# Autoverse Dashboard Credentials \(END\)\r?\n?/g, '\n')
    // Remove legacy format from previous package versions.
    .replace(/(?:\r?\n)?# Autoverse Dashboard Credentials\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_AGENT_NAME=.*\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_USERNAME=.*\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_PASSWORD=.*(?:\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_AI_PROVIDER=.*)?(?:\r?\n(?:NEXT_PUBLIC|VITE|REACT_APP)_AUTOVERSE_AI_MODEL=.*)?(?:\r?\n(?:VITE|REACT_APP)_[A-Z0-9_]+_API_KEY=.*)?(?:\r?\nAUTOVERSE_AI_PROVIDER=.*)?(?:\r?\nAUTOVERSE_AI_MODEL=.*)?(?:\r?\n[A-Z0-9_]+_API_KEY=.*)?\r?\n?/g, '\n')
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
