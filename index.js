#!/usr/bin/env node

const readline = require('readline');
const { detect, saveEnv } = require('./lib/detect');
const { setupNext }       = require('./lib/setup-next');
const { setupReact }      = require('./lib/setup-react');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const askRequired = async (question, fieldName) => {
  while (true) {
    const value = await ask(question);
    if (value.trim() !== '') return value.trim();
    console.log(`\x1b[31m  ${fieldName} cannot be empty. Please try again.\x1b[0m`);
  }
};

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
  const geminiApiKey = await askRequired('  Enter Gemini API key    : ', 'Gemini API key');

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

  saveEnv(cwd, envPrefix, agentName, username, password, geminiApiKey);

  if (framework === 'next') {
    setupNext(cwd, baseDir, agentName, username, password);
  } else if (framework === 'react') {
    setupReact(cwd);
  }

  rl.close();
}

main();