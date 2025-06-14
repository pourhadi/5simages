#!/usr/bin/env node

// Simple test script for the MCP server
// Run with: node test.js

import { spawn } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    // Add your test credentials here
    STILLMOTION_API_URL: process.env.STILLMOTION_API_URL || 'http://localhost:3000',
    STILLMOTION_EMAIL: process.env.STILLMOTION_EMAIL,
    STILLMOTION_PASSWORD: process.env.STILLMOTION_PASSWORD
  }
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log('Server response:', JSON.parse(data.toString()));
});

// Send a test request to list tools
const listToolsRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1
};

console.log('Sending list tools request...');
server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Wait a bit then send a user info request
setTimeout(() => {
  const userInfoRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'get_user_info',
      arguments: {}
    },
    id: 2
  };
  
  console.log('\nSending get user info request...');
  server.stdin.write(JSON.stringify(userInfoRequest) + '\n');
}, 2000);

// Clean up after 5 seconds
setTimeout(() => {
  console.log('\nClosing test...');
  server.kill();
  rl.close();
  process.exit(0);
}, 5000);