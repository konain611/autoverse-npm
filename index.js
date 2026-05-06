#!/usr/bin/env node

const readline = require('readline');
const { detect, saveEnv } = require('./lib/detect');
const { setupNext }       = require('./lib/setup-next');
const { setupReact }      = require('./lib/setup-react');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const AI_PROVIDERS = [
  { id: 'gemini',     label: 'Google Gemini',    envKey: 'GEMINI_API_KEY',      keyLabel: 'Gemini',     model: 'gemini-2.0-flash' },
  { id: 'openai',     label: 'OpenAI',           envKey: 'OPENAI_API_KEY',      keyLabel: 'OpenAI',     model: 'gpt-4o-mini' },
  { id: 'anthropic',  label: 'Anthropic Claude', envKey: 'ANTHROPIC_API_KEY',   keyLabel: 'Anthropic',  model: 'claude-3-5-haiku-latest' },
  { id: 'openrouter', label: 'OpenRouter',       envKey: 'OPENROUTER_API_KEY',  keyLabel: 'OpenRouter', model: 'openai/gpt-4o-mini' },
  { id: 'groq',       label: 'Groq',             envKey: 'GROQ_API_KEY',        keyLabel: 'Groq',       model: 'llama-3.3-70b-versatile' },
  { id: 'mistral',    label: 'Mistral AI',       envKey: 'MISTRAL_API_KEY',     keyLabel: 'Mistral',    model: 'mistral-small-latest' },
  { id: 'cohere',     label: 'Cohere',           envKey: 'COHERE_API_KEY',      keyLabel: 'Cohere',     model: 'command-r-plus' },
  { id: 'perplexity', label: 'Perplexity',       envKey: 'PERPLEXITY_API_KEY',  keyLabel: 'Perplexity', model: 'sonar' },
  { id: 'together',   label: 'Together AI',      envKey: 'TOGETHER_API_KEY',    keyLabel: 'Together AI', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { id: 'xai',        label: 'xAI',              envKey: 'XAI_API_KEY',         keyLabel: 'xAI',        model: 'grok-2-latest' },
  { id: 'deepseek',   label: 'DeepSeek',         envKey: 'DEEPSEEK_API_KEY',    keyLabel: 'DeepSeek',   model: 'deepseek-chat' },
];

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const askRequired = async (question, fieldName) => {
  while (true) {
    const value = await ask(question);
    if (value.trim() !== '') return value.trim();
    console.log(`\x1b[31m  ${fieldName} cannot be empty. Please try again.\x1b[0m`);
  }
};

function renderProviderList(selectedIndex) {
  console.log('  Select your AI provider:\n');
  AI_PROVIDERS.forEach((provider, index) => {
    const selected = index === selectedIndex;
    const pointer = selected ? '>' : ' ';
    const color = selected ? '\x1b[7m' : '';
    const reset = selected ? '\x1b[0m' : '';
    console.log(`  ${pointer} ${color}${provider.label.padEnd(18)} ${provider.model}${reset}`);
  });
  console.log('\n  Use ↑/↓ arrows and press Enter.\n');
}

async function askProviderChoice() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log('\n  Select your AI provider:\n');
    AI_PROVIDERS.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.label} (${provider.model})`);
    });
    while (true) {
      const value = await ask('\n  Enter provider number: ');
      const index = Number(value.trim()) - 1;
      if (AI_PROVIDERS[index]) return AI_PROVIDERS[index];
      console.log('\x1b[31m  Please choose a valid provider number.\x1b[0m');
    }
  }

  return new Promise((resolve) => {
    let selectedIndex = 0;
    const lineCount = AI_PROVIDERS.length + 4;

    readline.emitKeypressEvents(process.stdin, rl);
    process.stdin.setRawMode(true);

    function redraw() {
      process.stdout.write('\x1b[?25l');
      process.stdout.write(`\x1b[${lineCount}F`);
      process.stdout.write('\x1b[J');
      renderProviderList(selectedIndex);
    }

    function cleanup(provider) {
      process.stdin.setRawMode(false);
      process.stdin.off('keypress', onKeypress);
      process.stdout.write('\x1b[?25h');
      console.log(`  Selected: ${provider.label}\n`);
      resolve(provider);
    }

    function onKeypress(_, key) {
      if (key?.name === 'up') {
        selectedIndex = (selectedIndex - 1 + AI_PROVIDERS.length) % AI_PROVIDERS.length;
        redraw();
        return;
      }
      if (key?.name === 'down') {
        selectedIndex = (selectedIndex + 1) % AI_PROVIDERS.length;
        redraw();
        return;
      }
      if (key?.name === 'return' || key?.name === 'enter') {
        cleanup(AI_PROVIDERS[selectedIndex]);
        return;
      }
      if (key?.ctrl && key?.name === 'c') {
        process.stdout.write('\x1b[?25h');
        process.exit(130);
      }
    }

    console.log('');
    renderProviderList(selectedIndex);
    process.stdin.on('keypress', onKeypress);
  });
}

async function main() {
  console.log('\n  Welcome to Autoverse Agent CLI\n');

  console.log('\x1b[33m');
  console.log('  --------------------------------------------------');
  console.log('  IMPORTANT — Read carefully before continuing.');
  console.log('');
  console.log('  You are about to create credentials for your');
  console.log('  Autoverse Dashboard. These will be saved to');
  console.log('  your .env file. You can change them later if needed.');
  console.log('');
  console.log('  Your input is case-sensitive.');
  console.log('  --------------------------------------------------');
  console.log('\x1b[0m');

  const agentName = await askRequired('  Enter your Agent name   : ', 'Agent name');
  const username  = await askRequired('  Create a username       : ', 'Username');
  const password  = await askRequired('  Create a password       : ', 'Password');
  const provider  = await askProviderChoice();
  const apiKey    = await askRequired(`  Enter your ${provider.keyLabel} key : `, `${provider.keyLabel} API key`);

  console.log('\n  Got it! Setting up your Autoverse Dashboard...\n');

  const cwd = process.cwd();
  const { framework, baseDir, envPrefix } = detect(cwd);

  if (!framework) {
    console.log('\x1b[31m');
    console.log('  This does not look like a Next.js or React project.');
    console.log('  Please run this inside your project folder.');
    console.log('\x1b[0m\n');
    rl.close();
    process.exit(1);
  }

  saveEnv(cwd, envPrefix, agentName, username, password, provider, apiKey);

  if (framework === 'next') {
    setupNext(cwd, baseDir, agentName, username, password);
  } else if (framework === 'react') {
    setupReact(cwd);
  }

  rl.close();
}

main();
