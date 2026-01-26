/**
 * Direct n8n API Test
 * Tests n8n API connection without MCP layer
 */

const N8N_URL = process.argv[2] || 'https://your-n8n.com';
const N8N_API_KEY = process.argv[3] || '';

if (!N8N_API_KEY) {
  console.error('❌ Error: API key required');
  console.log('Usage: node test-n8n-api-direct.js <URL> <API_KEY>');
  process.exit(1);
}

console.log('🔬 Direct n8n API Connection Test\n');
console.log(`📡 n8n Instance: ${N8N_URL}`);
console.log(`🔑 API Key: ${N8N_API_KEY.substring(0, 20)}...\n`);

// Test workflow for creation
let testWorkflowId = null;
let testTagId = null;
let testVariableId = null;

async function testN8nAPI() {
  let passed = 0;
  let failed = 0;

  // Helper function
  async function callAPI(method, endpoint, body = null) {
    const url = `${N8N_URL}/api/v1${endpoint}`;
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${response.status}: ${data.message || JSON.stringify(data)}`);
    }

    return data;
  }

  // Test 1: List workflows
  console.log('🔧 Test 1: GET /api/v1/workflows (list workflows)');
  try {
    const result = await callAPI('GET', '/workflows');
    console.log(`   ✅ Success - Found ${result.data?.length || 0} workflows`);
    if (result.data?.[0]) {
      console.log(`   First workflow: ${result.data[0].name}`);
    }
    passed++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 2: List tags
  console.log('\n🔧 Test 2: GET /api/v1/tags (list tags)');
  try {
    const result = await callAPI('GET', '/tags');
    console.log(`   ✅ Success - Found ${result.data?.length || 0} tags`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 3: List variables
  console.log('\n🔧 Test 3: GET /api/v1/variables (list variables)');
  try {
    const result = await callAPI('GET', '/variables');
    console.log(`   ✅ Success - Found ${result.data?.length || 0} variables`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 4: Create tag
  console.log('\n🔧 Test 4: POST /api/v1/tags (create tag)');
  try {
    const tagName = `mcp-test-${Date.now()}`;
    const result = await callAPI('POST', '/tags', { name: tagName });
    testTagId = result.id;
    console.log(`   ✅ Success - Created tag "${tagName}" ID: ${testTagId}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 5: Create variable
  console.log('\n🔧 Test 5: POST /api/v1/variables (create variable)');
  try {
    const result = await callAPI('POST', '/variables', {
      key: 'MCP_TEST_VAR',
      value: 'test-value',
      // Note: 'type' parameter is read-only, don't send it
    });
    testVariableId = result.id;
    console.log(`   ✅ Success - Created variable ID: ${testVariableId}`);
    passed++;
  } catch (error) {
    console.log(`   ⚠️  Skipped: ${error.message}`);
    // Don't fail - variables may not be available in license
  }

  // Test 6: Create workflow
  console.log('\n🔧 Test 6: POST /api/v1/workflows (create workflow)');
  try {
    const result = await callAPI('POST', '/workflows', {
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
      settings: {
        executionOrder: 'v1',
      },
      // Note: 'active' is read-only, use activate/deactivate endpoints instead
    });
    testWorkflowId = result.id;
    console.log(`   ✅ Success - Created workflow ID: ${testWorkflowId}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 7: Get workflow
  if (testWorkflowId) {
    console.log(`\n🔧 Test 7: GET /api/v1/workflows/${testWorkflowId} (get workflow)`);
    try {
      const result = await callAPI('GET', `/workflows/${testWorkflowId}`);
      console.log(`   ✅ Success - Retrieved workflow: ${result.name}`);
      passed++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  // Test 8: Update workflow
  if (testWorkflowId) {
    console.log(`\n🔧 Test 8: PUT /api/v1/workflows/${testWorkflowId} (update workflow)`);
    try {
      // Note: UPDATE requires full workflow object including nodes
      const result = await callAPI('PUT', `/workflows/${testWorkflowId}`, {
        name: 'MCP Test Updated (DELETE ME)',
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
        settings: {
          executionOrder: 'v1',
        },
      });
      console.log(`   ✅ Success - Updated to: ${result.name}`);
      passed++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  // Cleanup
  console.log('\n' + '='.repeat(60));
  console.log('🧹 CLEANUP');
  console.log('='.repeat(60));

  if (testWorkflowId) {
    console.log(`\n🗑️  Deleting workflow ${testWorkflowId}...`);
    try {
      await callAPI('DELETE', `/workflows/${testWorkflowId}`);
      console.log('   ✅ Deleted');
    } catch (error) {
      console.log(`   ⚠️  ${error.message}`);
    }
  }

  if (testVariableId) {
    console.log(`\n🗑️  Deleting variable ${testVariableId}...`);
    try {
      await callAPI('DELETE', `/variables/${testVariableId}`);
      console.log('   ✅ Deleted');
    } catch (error) {
      console.log(`   ⚠️  ${error.message}`);
    }
  }

  if (testTagId) {
    console.log(`\n🗑️  Deleting tag ${testTagId}...`);
    try {
      await callAPI('DELETE', `/tags/${testTagId}`);
      console.log('   ✅ Deleted');
    } catch (error) {
      console.log(`   ⚠️  ${error.message} (API key may lack permission - owner only)`);
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`n8n Instance: ${N8N_URL}`);
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

testN8nAPI().catch((error) => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
