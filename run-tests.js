/**
 * Test Runner - Starts server and runs tests
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🚀 Starting test server...');

// Start server
const server = spawn('node', ['test-server.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Test Server Running')) {
    serverReady = true;
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Wait for server to start
console.log('⏳ Waiting for server to be ready...');
for (let i = 0; i < 10; i++) {
  await setTimeout(500);
  if (serverReady) break;
}

if (!serverReady) {
  console.error('❌ Server failed to start');
  server.kill();
  process.exit(1);
}

console.log('✅ Server ready!\n');

// Run tests
console.log('🧪 Running tests...\n');
const tests = spawn('node', ['test.js'], {
  stdio: 'inherit',
});

tests.on('close', (code) => {
  console.log('\n🛑 Stopping server...');
  server.kill();
  process.exit(code);
});
