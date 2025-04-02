// expanded-supabase-test.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  console.error('Please make sure you have a .env file with the following variables:');
  console.error('REACT_APP_SUPABASE_URL or SUPABASE_URL');
  console.error('REACT_APP_SUPABASE_ANON_KEY or SUPABASE_KEY');
  process.exit(1);
}

console.log('Testing connection to Supabase instance:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to check if a table exists
async function checkTableExists(tableName) {
  try {
    console.log(`Checking if '${tableName}' table exists...`);
    
    // Try to select a single record with limit 1
    const { data, error, status } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error(`❌ Table '${tableName}' does not exist`);
        return false;
      } else {
        console.error(`❌ Error checking '${tableName}' table:`, error.message);
        return false;
      }
    }
    
    console.log(`✅ Table '${tableName}' exists and is accessible`);
    console.log(`   Found ${data.length} sample records`);
    return true;
  } catch (err) {
    console.error(`❌ Unexpected error checking '${tableName}' table:`, err.message);
    return false;
  }
}

// Test database function exists and works
async function testExecuteDynamicQuery() {
  console.log("\nTesting execute_dynamic_query function...");
  try {
    const { data, error } = await supabase.rpc('execute_dynamic_query', {
      query_sql: 'SELECT 1 as test'
    });

    if (error) {
      console.error('❌ Error calling execute_dynamic_query:', error.message);
      return false;
    }

    console.log('✅ execute_dynamic_query function is working');
    console.log('   Result:', JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('❌ Unexpected error testing execute_dynamic_query:', err.message);
    return false;
  }
}

// Test Edge Function with detailed error reporting
async function testEdgeFunction() {
  console.log('\nTesting nlp-query Edge Function with detailed reporting...');
  
  try {
    // Define a simple test query
    const testQueries = [
      { name: "Simple query", query: "Show me properties in Manhattan" },
      { name: "Fallback pattern query", query: "Show me vacant lots in Brooklyn" }
    ];
    
    for (const testCase of testQueries) {
      console.log(`\nTrying test case: "${testCase.name}"`);
      const response = await fetch(`${supabaseUrl}/functions/v1/nlp-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query: testCase.query, userId: null })
      });
      
      console.log('Status:', response.status, response.statusText);
      
      // Get response body
      const responseText = await response.text();
      
      try {
        // Try to parse as JSON
        const responseData = JSON.parse(responseText);
        
        // Check if there's an error
        if (responseData.error) {
          console.error('❌ Function returned error:', responseData.error);
          
          // Log additional details if available
          if (responseData.sql) {
            console.log('   Generated SQL:', responseData.sql);
          }
          
          if (responseData.stack) {
            console.log('   Error stack:', responseData.stack);
          }
        } else {
          console.log('✅ Function call succeeded');
          console.log('   Results count:', responseData.count);
          console.log('   Explanation:', responseData.explanation);
          console.log('   Generated SQL:', responseData.sql);
        }
      } catch (parseErr) {
        // Not JSON or parse error
        console.error('❌ Could not parse response as JSON:');
        console.log('   Raw response:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      }
    }
  } catch (err) {
    console.error('❌ Error making request to Edge Function:', err.message);
  }
}

// Main test function
async function runTest() {
  try {
    // Test basic Supabase connection
    const { data: versionData, error: versionError } = await supabase.rpc('version');
    
    if (versionError) {
      console.error('❌ Failed to connect to Supabase:', versionError.message);
    } else {
      console.log('✅ Successfully connected to Supabase');
      if (versionData) {
        console.log('   PostgreSQL version:', versionData);
      }
    }
    
    // Check for required tables
    const requiredTables = [
      'properties',
      'opportunity_types',
      'query_templates',
      'saved_searches'
    ];
    
    const results = {};
    for (const table of requiredTables) {
      results[table] = await checkTableExists(table);
    }
    
    // Summary for tables
    console.log('\n--- Table Test Summary ---');
    const allTablesExist = Object.values(results).every(result => result);
    
    if (allTablesExist) {
      console.log('✅ All required tables exist and are accessible');
    } else {
      console.log('❌ Some required tables are missing:');
      Object.entries(results).forEach(([table, exists]) => {
        if (!exists) {
          console.log(`   - '${table}' table is missing`);
        }
      });
    }
    
    // Test the database function
    await testExecuteDynamicQuery();
    
    // Test the Edge Function with detailed reporting
    await testEdgeFunction();
    
  } catch (err) {
    console.error('❌ Unexpected error during test:', err);
  }
}

runTest();