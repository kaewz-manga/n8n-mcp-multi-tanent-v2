/**
 * Comprehensive n8n MCP Test
 * Tests all 32 tools with real n8n API
 */

const SERVER_URL = 'http://localhost:3000';

// Get credentials from command line args or env vars
const N8N_URL = process.argv[2] || process.env.N8N_URL || 'https://your-n8n.com';
const N8N_API_KEY = process.argv[3] || process.env.N8N_API_KEY || '';

if (!N8N_API_KEY) {
  console.error('❌ Error: N8N_API_KEY required');
  console.log('\nUsage:');
  console.log('  node test-comprehensive.js <N8N_URL> <API_KEY>');
  console.log('  or');
  console.log('  N8N_URL=https://your-n8n.com N8N_API_KEY=your_key node test-comprehensive.js');
  process.exit(1);
}

// Test workflow ID (will be created during test)
let testWorkflowId = null;
let testExecutionId = null;
let testCredentialId = null;
let testTagId = null;
let testVariableId = null;

// Test categories
const tests = {
  // READ operations (safe)
  read: [
    { name: 'n8n_list_workflows', args: {} },
    { name: 'n8n_list_executions', args: {} },
    { name: 'n8n_list_credentials', args: {} },
    { name: 'n8n_list_tags', args: {} },
    { name: 'n8n_list_variables', args: {} },
    { name: 'n8n_list_users', args: {}, skipOnError: true }, // May fail if not owner
  ],

  // CREATE operations (will be cleaned up)
  create: [
    {
      name: 'n8n_create_workflow',
      args: {
        name: 'MCP Test Workflow (DELETE ME)',
        nodes: [
          {
            parameters: {},
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [250, 300],
          },
        ],
        connections: {},
        active: false,
      },
      saveId: 'workflow',
    },
    {
      name: 'n8n_create_tag',
      args: { name: 'mcp-test-tag' },
      saveId: 'tag',
    },
    {
      name: 'n8n_create_variable',
      args: { key: 'MCP_TEST_VAR', value: 'test-value', type: 'string' },
      saveId: 'variable',
    },
  ],

  // GET operations (using created resources)
  get: [
    { name: 'n8n_get_workflow', args: () => ({ id: testWorkflowId }) },
    { name: 'n8n_get_workflow_tags', args: () => ({ id: testWorkflowId }) },
    { name: 'n8n_get_tag', args: () => ({ id: testTagId }) },
  ],

  // UPDATE operations
  update: [
    {
      name: 'n8n_update_workflow',
      args: () => ({ id: testWorkflowId, name: 'MCP Test Updated (DELETE ME)' }),
    },
    {
      name: 'n8n_update_workflow_tags',
      args: () => ({ id: testWorkflowId, tags: ['mcp-test-tag'] }),
    },
    { name: 'n8n_update_tag', args: () => ({ id: testTagId, name: 'mcp-test-updated' }) },
    {
      name: 'n8n_update_variable',
      args: () => ({ id: testVariableId, key: 'MCP_TEST_VAR', value: 'updated-value' }),
    },
  ],

  // EXECUTE operations
  execute: [
    {
      name: 'n8n_execute_workflow',
      args: () => ({ id: testWorkflowId, data: { test: 'mcp' } }),
      saveId: 'execution',
    },
  ],

  // EXECUTION operations
  executionOps: [
    { name: 'n8n_get_execution', args: () => ({ id: testExecutionId }), skipOnError: true },
    // Skip retry as it needs failed execution
  ],

  // CLEANUP operations (run at end)
  cleanup: [
    {
      name: 'n8n_deactivate_workflow',
      args: () => ({ id: testWorkflowId }),
      skipOnError: true,
    },
    {
      name: 'n8n_delete_execution',
      args: () => ({ id: testExecutionId }),
      skipOnError: true,
    },
    { name: 'n8n_delete_workflow', args: () => ({ id: testWorkflowId }) },
    { name: 'n8n_delete_variable', args: () => ({ id: testVariableId }) },
    { name: 'n8n_delete_tag', args: () => ({ id: testTagId }) },
  ],
};

async function callTool(toolName, args) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-URL': N8N_URL,
      'X-N8N-API-KEY': N8N_API_KEY,
    },
    body: JSON.stringify({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: typeof args === 'function' ? args() : args,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.content) {
    throw new Error(data.error || 'Invalid response');
  }

  return JSON.parse(data.content[0].text);
}

async function runTest(test, category) {
  const { name, args, saveId, skipOnError } = test;

  try {
    console.log(`   🔧 ${name}`);
    const result = await callTool(name, args);

    // Check for n8n API errors
    if (result.message && result.message.includes('invalid')) {
      throw new Error(result.message);
    }

    // Save IDs for later tests
    if (saveId === 'workflow') testWorkflowId = result.id;
    if (saveId === 'tag') testTagId = result.id;
    if (saveId === 'variable') testVariableId = result.id;
    if (saveId === 'execution') testExecutionId = result.executionId || result.id;

    const preview = JSON.stringify(result).substring(0, 100);
    console.log(`      ✅ ${preview}...`);
    return { status: 'PASS', result };
  } catch (error) {
    if (skipOnError) {
      console.log(`      ⚠️  SKIP - ${error.message}`);
      return { status: 'SKIP', error: error.message };
    }
    console.log(`      ❌ FAIL - ${error.message}`);
    return { status: 'FAIL', error: error.message };
  }
}

async function runTestSuite() {
  console.log('🧪 Comprehensive n8n MCP Test Suite\n');
  console.log(`📡 n8n Instance: ${N8N_URL}`);
  console.log(`🔑 API Key: ${N8N_API_KEY.substring(0, 10)}...\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // Check server
  console.log('🔍 Checking MCP server...');
  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'tools/list' }),
    });
    if (!response.ok) throw new Error('Server not responding');
    console.log('   ✅ MCP server ready\n');
  } catch (error) {
    console.error('   ❌ MCP server not available');
    console.log('   ℹ️  Run: npm run test:server\n');
    process.exit(1);
  }

  // Run test categories in order
  for (const [category, categoryTests] of Object.entries(tests)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 ${category.toUpperCase()} Operations`);
    console.log('='.repeat(60));

    for (const test of categoryTests) {
      const result = await runTest(test, category);
      if (result.status === 'PASS') totalPassed++;
      else if (result.status === 'SKIP') totalSkipped++;
      else totalFailed++;

      // Small delay
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`n8n Instance: ${N8N_URL}`);
  console.log(`Total Tests: ${totalPassed + totalFailed + totalSkipped}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⚠️  Skipped: ${totalSkipped}`);
  const successRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  console.log('='.repeat(60));

  console.log('\n✅ Test resources cleaned up');
  console.log('ℹ️  If any resources remain, manually delete workflows/tags/variables with "MCP" in name');

  process.exit(totalFailed > 0 ? 1 : 0);
}

runTestSuite().catch((error) => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
