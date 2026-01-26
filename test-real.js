/**
 * Real n8n API Test
 * Tests against actual n8n instance
 */

import * as readline from 'readline';

// Interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Test cases (non-destructive only)
const safetests = [
  {
    name: 'n8n_list_workflows',
    description: 'List workflows',
    args: {},
  },
  {
    name: 'n8n_list_executions',
    description: 'List executions',
    args: {},
  },
  {
    name: 'n8n_list_credentials',
    description: 'List credentials',
    args: {},
  },
  {
    name: 'n8n_list_tags',
    description: 'List tags',
    args: {},
  },
  {
    name: 'n8n_list_variables',
    description: 'List variables',
    args: {},
  },
  {
    name: 'n8n_list_users',
    description: 'List users (requires owner)',
    args: {},
  },
];

async function testRealN8n() {
  console.log('🔧 n8n MCP Real API Test\n');

  // Get credentials
  console.log('กรุณาใส่ข้อมูล n8n instance ของคุณ:\n');
  const n8nUrl = await question('n8n URL (e.g., https://n8n-no1.missmanga.org): ');
  const apiKey = await question('n8n API Key: ');

  if (!n8nUrl || !apiKey) {
    console.log('\n❌ Missing URL or API key');
    rl.close();
    return;
  }

  console.log(`\n📡 Testing connection to: ${n8nUrl}`);
  console.log('⏳ Running safe read-only tests...\n');

  const SERVER_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;
  const results = [];

  // Test 1: Server availability
  console.log('🔍 Test 0: Check MCP server');
  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-URL': n8nUrl,
        'X-N8N-API-KEY': apiKey,
      },
      body: JSON.stringify({ method: 'tools/list' }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ PASS - MCP server ready (${data.tools.length} tools)\n`);
      passed++;
    } else {
      console.log('   ❌ FAIL - MCP server not responding\n');
      console.log('   ℹ️  Run: npm run test:server (in another terminal)\n');
      failed++;
      rl.close();
      return;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Cannot connect to MCP server');
    console.log('   ℹ️  Run: npm run test:server (in another terminal)\n');
    failed++;
    rl.close();
    return;
  }

  // Test each tool
  for (let i = 0; i < safetests.length; i++) {
    const test = safetests[i];
    const testNum = i + 1;

    console.log(`🔧 Test ${testNum}: ${test.name}`);
    console.log(`   Description: ${test.description}`);

    try {
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-URL': n8nUrl,
          'X-N8N-API-KEY': apiKey,
        },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: test.name,
            arguments: test.args,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.content) {
        const result = JSON.parse(data.content[0].text);

        // Check if it's an error response
        if (result.message && result.message.includes('API-Key is invalid')) {
          console.log('   ❌ FAIL - Invalid API Key');
          console.log('   ℹ️  Check your n8n API key\n');
          failed++;
          results.push({ test: test.name, status: 'FAIL', error: 'Invalid API key' });
        } else if (result.message && result.message.includes('Forbidden')) {
          console.log('   ⚠️  SKIP - Requires owner permissions');
          console.log(`   Response: ${result.message}\n`);
          results.push({ test: test.name, status: 'SKIP', note: 'Permission denied' });
        } else {
          // Success
          const preview = JSON.stringify(result, null, 2).substring(0, 150);
          console.log('   ✅ PASS');
          console.log(`   Response: ${preview}...\n`);
          passed++;
          results.push({ test: test.name, status: 'PASS', data: result });
        }
      } else {
        console.log(`   ❌ FAIL - ${data.error || 'Invalid response'}\n`);
        failed++;
        results.push({ test: test.name, status: 'FAIL', error: data.error });
      }
    } catch (error) {
      console.log(`   ❌ FAIL - ${error.message}\n`);
      failed++;
      results.push({ test: test.name, status: 'FAIL', error: error.message });
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`n8n Instance: ${n8nUrl}`);
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  if (skipped > 0) {
    console.log(`⚠️  Skipped: ${skipped} (permission required)`);
  }
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // Data preview
  if (passed > 0) {
    console.log('\n📋 Sample Data Retrieved:');
    results
      .filter((r) => r.status === 'PASS')
      .slice(0, 3)
      .forEach((r) => {
        console.log(`\n${r.test}:`);
        console.log(JSON.stringify(r.data, null, 2).substring(0, 200));
      });
  }

  // Failed details
  if (failed > 0) {
    console.log('\n\n❌ Failed Tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   - ${r.test}: ${r.error}`);
      });
  }

  rl.close();
  process.exit(failed > 0 ? 1 : 0);
}

// Run
testRealN8n().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
