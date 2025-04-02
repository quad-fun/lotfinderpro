// supabase-connection-test.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
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

// Test Supabase connection and check for required tables
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
    
    // Summary
    console.log('\n--- Test Summary ---');
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
      
      console.log('\nTo fix this, you need to run the database migrations:');
      console.log('1. Navigate to your project root directory');
      console.log('2. Run: supabase migration up');
      console.log('   or: psql -h [host] -d [database] -U [user] -f supabase/migrations/01_initial_schema.sql');
    }
    
    // Test Edge Function availability
    console.log('\nTesting nlp-query Edge Function...');
    try {
      const { data: nlpData, error: nlpError } = await supabase.functions.invoke('nlp-query', {
        body: { query: 'test query', userId: null }
      });
      
      if (nlpError) {
        console.error('❌ Error calling nlp-query function:', nlpError.message);
      } else {
        console.log('✅ Successfully connected to nlp-query Edge Function');
        console.log('   Response:', nlpData);
      }
    } catch (err) {
      console.error('❌ Edge Function error:', err.message);
      console.log('   To fix this, deploy the Edge Function:');
      console.log('   supabase functions deploy nlp-query');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error during test:', err);
  }
}

runTest();