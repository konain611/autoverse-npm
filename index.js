#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n Welcome to Autoverse Agent CLI!\n');

rl.question(' What is your name? ', (name) => {
  console.log(`\n Download successful! Thank you, ${name}!\n`);
  rl.close();
});