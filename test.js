/**
 * Automated Test Suite for n8n MCP Server
 * Tests all 32 tools
 */

const SERVER_URL = 'http://localhost:3000';

// Test cases for all 32 tools
const testCases = [
  // Workflow Tools (10)
  {
    name: 'n8n_list_workflows',
    description: 'List all workflows',
    args: {},
  },
  {
    name: 'n8n_get_workflow',
    description: 'Get workflow by ID',
    args: { id: '123' },
  },
  {
    name: 'n8n_create_workflow',
    description: 'Create new workflow',
    args: {
      name: 'Test Workflow',
      nodes: [],
      connections: {},
    },
  },
  {
    name: 'n8n_update_workflow',
    description: 'Update workflow',
    args: {
      id: '123',
      name: 'Updated Workflow',
    },
  },
  {
    name: 'n8n_delete_workflow',
    description: 'Delete workflow',
    args: { id: '123' },
  },
  {
    name: 'n8n_activate_workflow',
    description: 'Activate workflow',
    args: { id: '123' },
  },
  {
    name: 'n8n_deactivate_workflow',
    description: 'Deactivate workflow',
    args: { id: '123' },
  },
  {
    name: 'n8n_execute_workflow',
    description: 'Execute workflow',
    args: { id: '123', data: { input: 'test' } },
  },
  {
    name: 'n8n_get_workflow_tags',
    description: 'Get workflow tags',
    args: { id: '123' },
  },
  {
    name: 'n8n_update_workflow_tags',
    description: 'Update workflow tags',
    args: { id: '123', tags: ['production', 'test'] },
  },

  // Execution Tools (4)
  {
    name: 'n8n_list_executions',
    description: 'List executions',
    args: {},
  },
  {
    name: 'n8n_get_execution',
    description: 'Get execution details',
    args: { id: 'exec-123' },
  },
  {
    name: 'n8n_delete_execution',
    description: 'Delete execution',
    args: { id: 'exec-123' },
  },
  {
    name: 'n8n_retry_execution',
    description: 'Retry failed execution',
    args: { id: 'exec-123' },
  },

  // Credential Tools (5)
  {
    name: 'n8n_list_credentials',
    description: 'List all credentials',
    args: {},
  },
  {
    name: 'n8n_create_credential',
    description: 'Create credential',
    args: {
      name: 'GitHub Token',
      type: 'githubApi',
      data: { token: 'test' },
    },
  },
  {
    name: 'n8n_update_credential',
    description: 'Update credential',
    args: { id: '456', name: 'Updated GitHub' },
  },
  {
    name: 'n8n_delete_credential',
    description: 'Delete credential',
    args: { id: '456' },
  },
  {
    name: 'n8n_get_credential_schema',
    description: 'Get credential schema',
    args: { credentialType: 'githubApi' },
  },

  // Tag Tools (5)
  {
    name: 'n8n_list_tags',
    description: 'List all tags',
    args: {},
  },
  {
    name: 'n8n_get_tag',
    description: 'Get tag details',
    args: { id: '789' },
  },
  {
    name: 'n8n_create_tag',
    description: 'Create tag',
    args: { name: 'production' },
  },
  {
    name: 'n8n_update_tag',
    description: 'Update tag',
    args: { id: '789', name: 'staging' },
  },
  {
    name: 'n8n_delete_tag',
    description: 'Delete tag',
    args: { id: '789' },
  },

  // Variable Tools (4)
  {
    name: 'n8n_list_variables',
    description: 'List variables',
    args: {},
  },
  {
    name: 'n8n_create_variable',
    description: 'Create variable',
    args: { key: 'API_URL', value: 'https://api.example.com', type: 'string' },
  },
  {
    name: 'n8n_update_variable',
    description: 'Update variable',
    args: { id: '101', key: 'API_URL', value: 'https://new-api.example.com' },
  },
  {
    name: 'n8n_delete_variable',
    description: 'Delete variable',
    args: { id: '101' },
  },

  // User Tools (4)
  {
    name: 'n8n_list_users',
    description: 'List users',
    args: {},
  },
  {
    name: 'n8n_get_user',
    description: 'Get user by ID or email',
    args: { identifier: 'admin@example.com' },
  },
  {
    name: 'n8n_delete_user',
    description: 'Delete user',
    args: { id: '999' },
  },
  {
    name: 'n8n_update_user_role',
    description: 'Update user role',
    args: { id: '999', role: 'admin' },
  },
];

async function testMCPServer() {
  console.log('🧪 Starting n8n MCP Server Tests\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  // Test 1: List Tools
  console.log('📋 Test 1: List Tools');
  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-URL': 'https://n8n-test.example.com',
        'X-N8N-API-KEY': 'test-api-key',
      },
      body: JSON.stringify({ method: 'tools/list' }),
    });

    const data = await response.json();
    if (data.tools && data.tools.length === 32) {
      console.log('   ✅ PASS - Found 32 tools\n');
      passed++;
    } else {
      console.log(`   ❌ FAIL - Expected 32 tools, got ${data.tools?.length}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ FAIL - ${error.message}\n`);
    failed++;
  }

  // Test 2-33: Each Tool
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    const testNum = i + 2;

    console.log(`🔧 Test ${testNum}: ${test.name}`);
    console.log(`   Description: ${test.description}`);

    try {
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-URL': 'https://n8n-test.example.com',
          'X-N8N-API-KEY': 'test-api-key',
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
        console.log('   ✅ PASS');
        console.log(`   Response: ${data.content[0].text.substring(0, 100)}...\n`);
        passed++;
        results.push({ test: test.name, status: 'PASS' });
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

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // Failed tests detail
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   - ${r.test}: ${r.error}`);
      });
  }

  // Return exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testMCPServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
