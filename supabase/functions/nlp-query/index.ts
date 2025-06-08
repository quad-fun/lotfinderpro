// supabase/functions/nlp-query/index.ts - Performance optimized version

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are an AI that converts natural language queries about real estate properties into SQL queries.

Your task is to translate a user's question about properties into a valid SQL query that can be run against a PostgreSQL database.

The main table is called "properties" and has the following key columns:
- id: Primary key
- bbl: Borough, Block, and Lot identifier (unique)
- borough: Borough code (MN = Manhattan, BX = Bronx, BK = Brooklyn, QN = Queens, SI = Staten Island)
- block: Tax block number
- lot: Tax lot number
- address: Street address
- zipcode: ZIP code
- zonedist1: Primary zoning district (e.g. R3-2, C1-9, M1-1)
- bldgclass: Building class code (V* = vacant land, A* = single family, etc.)
- landuse: Land use category (11 = vacant land)
- lotarea: Lot area in square feet
- bldgarea: Building area in square feet
- comarea: Commercial area
- resarea: Residential area
- numfloors: Number of floors
- numbldgs: Number of buildings
- unitstotal: Total units
- unitsres: Residential units
- yearbuilt: Year built
- builtfar: Built Floor Area Ratio (current FAR)
- residfar: Maximum allowed residential FAR
- commfar: Maximum allowed commercial FAR
- assessland: Assessed land value
- assesstot: Total assessed value (land + improvements)
- built_status: Either 'built' or 'vacant' (computed field, may be unreliable)
- development_potential: Pre-calculated as (residfar - builtfar) * lotarea
- value_ratio: Pre-calculated as assessland / assesstot
- is_vacant: Boolean computed field for vacant lots

IMPORTANT BOROUGH CODES:
- For "in Manhattan", use WHERE borough = 'MN'
- For "in Brooklyn", use WHERE borough = 'BK'
- For "in the Bronx" or "in Bronx", use WHERE borough = 'BX'
- For "in Queens", use WHERE borough = 'QN'
- For "in Staten Island", use WHERE borough = 'SI'

VACANT LOT IDENTIFICATION (IMPORTANT - USE THESE INSTEAD OF built_status):
For vacant lots, use these criteria in priority order:
1. BEST: Building class starts with 'V' → WHERE bldgclass LIKE 'V%'
2. GOOD: Land use category 11 → WHERE landuse = '11'
3. OK: Use computed field → WHERE is_vacant = true
4. FALLBACK: No buildings → WHERE (yearbuilt IS NULL OR yearbuilt = 0) AND (bldgarea IS NULL OR bldgarea = 0)

NEVER use "built_status = 'vacant'" as the primary method - it's unreliable!

PERFORMANCE OPTIMIZATION RULES:
1. ALWAYS use the pre-calculated development_potential column instead of calculating (residfar - builtfar) * lotarea
2. ALWAYS use the pre-calculated value_ratio column instead of calculating assessland / assesstot
3. Use indexed columns for WHERE clauses: borough, bldgclass, zonedist1, landuse
4. Avoid complex calculations in ORDER BY - use pre-calculated columns
5. Always include LIMIT to prevent timeouts (default 50, max 100)
6. For air rights queries, use: WHERE development_potential > 0 ORDER BY development_potential DESC
7. For value-based sorting, use: ORDER BY assesstot DESC or ORDER BY value_ratio DESC

COLUMN SELECTION - Use efficient subset:
For performance, select only needed columns:
SELECT id, bbl, borough, block, lot, address, zipcode, zonedist1, bldgclass, 
       lotarea, bldgarea, builtfar, residfar, assessland, assesstot,
       yearbuilt, development_potential, value_ratio

OPTIMIZED QUERY PATTERNS:

For development opportunities:
WHERE development_potential > 0 AND borough = 'BX' ORDER BY development_potential DESC LIMIT 50

For high value properties:
WHERE value_ratio > 0.7 AND borough = 'BX' ORDER BY assesstot DESC LIMIT 50

For air rights transfer opportunities:
WHERE development_potential > 10000 AND residfar > 0 ORDER BY development_potential DESC LIMIT 50

For underutilized properties:
WHERE builtfar IS NOT NULL AND residfar > 0 AND builtfar < residfar * 0.5 ORDER BY development_potential DESC LIMIT 50

ZONING PATTERNS:
- R* = Residential (R1-R10)
- C* = Commercial (C1-C8)
- M* = Manufacturing (M1-M3)

Your response should be JSON formatted with these fields:
- sql: The SQL query to execute
- explanation: A plain English explanation of how you interpreted the query

Example for "Find properties in the Bronx with unused air rights":
{
  "sql": "SELECT id, bbl, borough, block, lot, address, zipcode, zonedist1, bldgclass, lotarea, bldgarea, builtfar, residfar, assessland, assesstot, yearbuilt, development_potential, value_ratio FROM properties WHERE borough = 'BX' AND development_potential > 0 ORDER BY development_potential DESC LIMIT 50",
  "explanation": "I searched for properties in the Bronx (borough code BX) with unused development rights by filtering for positive development potential values, sorted by the amount of unused development potential from highest to lowest."
}`;

// Optimized fallback function with performance focus
function fallbackTranslation(query: string, reason = "unknown") {
  console.log(`Using fallback translation for query: "${query}". Reason: ${reason}`);
  
  const query_lower = query.toLowerCase();
  let sql = "";
  let explanation = "";
  
  // Base SELECT with essential columns (avoiding potential NULL issues)
  const baseSelect = `SELECT id, bbl, borough, block, lot, address, zipcode, zonedist1, bldgclass, 
       lotarea, bldgarea, builtfar, residfar, assessland, assesstot,
       yearbuilt, development_potential, 
       CASE WHEN assesstot > 0 THEN assessland / assesstot ELSE NULL END as value_ratio`;
  
  // Extract potential borough
  let borough = null;
  if (query_lower.includes("manhattan")) {
    borough = "MN";
  } else if (query_lower.includes("brooklyn")) {
    borough = "BK";
  } else if (query_lower.includes("bronx") || query_lower.includes("the bronx")) {
    borough = "BX";
  } else if (query_lower.includes("queens")) {
    borough = "QN";
  } else if (query_lower.includes("staten island")) {
    borough = "SI";
  }
  
  // Handle air rights / development potential queries
  if (query_lower.includes("air rights") || query_lower.includes("unused") || 
      query_lower.includes("development potential") || query_lower.includes("underutilized")) {
    
    // More robust approach - check for development potential OR manual calculation
    sql = `${baseSelect} FROM properties WHERE (
      (development_potential IS NOT NULL AND development_potential > 0) OR 
      (residfar IS NOT NULL AND builtfar IS NOT NULL AND residfar > builtfar) OR
      (residfar IS NOT NULL AND builtfar IS NULL AND residfar > 0)
    )`;
    explanation = "I searched for properties with unused development rights, checking both pre-calculated development potential and manual FAR comparisons.";
    
    // Add minimum threshold for significant opportunities
    if (query_lower.includes("significant") || query_lower.includes("major")) {
      sql = sql.replace("development_potential > 0", "development_potential > 50000");
      explanation += " I filtered for significant development opportunities with substantial unused potential.";
    }
    
    sql += " ORDER BY COALESCE(development_potential, (residfar - COALESCE(builtfar, 0)) * lotarea) DESC";
  }
  // Handle vacant lot queries
  else if (query_lower.includes("vacant") && query_lower.includes("lot")) {
    sql = `${baseSelect} FROM properties WHERE bldgclass LIKE 'V%'`;
    explanation = "I found vacant lots using the official NYC building class V* designation for vacant land.";
    
    // Add size filter if present
    const sizeMatch = query.match(/(\d[\d,]*) sq(uare)? f(ee)?t/i) || 
                      query.match(/(\d[\d,]*) sqft/i) ||
                      query.match(/(over|more than|larger than|bigger than) (\d[\d,]*)/i);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]?.replace(/,/g, '') || sizeMatch[2]?.replace(/,/g, '') || '0');
      if (size > 0) {
        sql += ` AND lotarea > ${size}`;
        explanation += ` I filtered for lots larger than ${size.toLocaleString()} square feet.`;
      }
    }
    
    sql += " ORDER BY lotarea DESC";
  }
  // Handle value-based queries
  else if (query_lower.includes("value") || query_lower.includes("investment")) {
    sql = `${baseSelect} FROM properties WHERE assesstot > 0`;
    explanation = "I searched for properties with investment potential based on assessed values.";
    sql += " ORDER BY assesstot DESC";
  }
  // Default general search
  else {
    sql = `${baseSelect} FROM properties WHERE assesstot > 0`;
    explanation = "I performed a general property search.";
    sql += " ORDER BY assesstot DESC";
  }
  
  // Add borough filter if detected
  if (borough) {
    sql = sql.includes("WHERE") 
      ? sql.replace("WHERE", `WHERE borough = '${borough}' AND`) 
      : `${sql} WHERE borough = '${borough}'`;
    explanation = explanation.replace("I searched", `I searched in ${getBoroughName(borough)}`);
  }
  
  // Always add limit for performance
  sql += " LIMIT 50";
  
  return { sql, explanation };
}

function getBoroughName(code: string): string {
  const mapping = {
    'MN': 'Manhattan',
    'BK': 'Brooklyn', 
    'BX': 'the Bronx',
    'QN': 'Queens',
    'SI': 'Staten Island'
  };
  return mapping[code] || code;
}

// supabase/functions/nlp-query/index.ts - Updated serve function

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing NLP query: "${query}" for user: ${userId || 'anonymous'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result;
    
    try {
      // Try Claude API first
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': openaiApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user', 
              content: `Convert this natural language query to SQL: "${query}"`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text;
      
      if (!content) {
        throw new Error('No content in Claude response');
      }

      // Extract JSON from Claude's response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      result = JSON.parse(jsonMatch[0]);
      console.log('Claude API successful, generated SQL:', result.sql);

    } catch (claudeError) {
      console.log('Claude API failed, using fallback:', claudeError.message);
      result = fallbackTranslation(query, claudeError.message);
    }

    // Validate and execute the SQL query
    if (!result.sql) {
      throw new Error('No SQL query generated');
    }

    // Execute the query through Supabase
    const { data: queryData, error: queryError } = await supabase
      .rpc('execute_dynamic_query', { query_sql: result.sql });

    if (queryError) {
      console.error('Query execution error:', queryError);
      
      // If we get a timeout, try a simplified version
      if (queryError.message.includes('timeout') || queryError.message.includes('canceling statement')) {
        console.log('Query timed out, trying simplified version...');
        
        // Create a simplified version of the query
        const simplifiedResult = fallbackTranslation(query, 'timeout - using simplified query');
        
        const { data: retryData, error: retryError } = await supabase
          .rpc('execute_dynamic_query', { query_sql: simplifiedResult.sql });
          
        if (retryError) {
          throw new Error(`Simplified query also failed: ${retryError.message}`);
        }
        
        // 🔧 FIX: Unwrap the retry data too
        const unwrappedRetryData = retryData?.map(item => item.result || item) || [];
        
        return new Response(
          JSON.stringify({
            data: unwrappedRetryData,
            count: unwrappedRetryData?.length || 0,
            sql: simplifiedResult.sql,
            explanation: simplifiedResult.explanation + " (Note: Used simplified query due to performance constraints)",
            source: 'fallback_timeout'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Query execution error: ${queryError.message}`);
    }

    // 🔧 FIX: Unwrap the 'result' objects from the RPC response
    const unwrappedData = queryData?.map(item => {
      // If the item has a 'result' property, return that; otherwise return the item as-is
      return item.result || item;
    }) || [];

    console.log('🔧 Unwrapped data sample:', unwrappedData[0]);
    console.log('🔧 Unwrapped data length:', unwrappedData.length);

    // Save successful query if userId provided
    if (userId && result.sql) {
      try {
        await supabase
          .from('saved_searches')
          .insert({
            user_id: userId,
            query_text: query,
            sql_query: result.sql,
            result_count: unwrappedData?.length || 0  // Use unwrapped length
          });
      } catch (saveError) {
        console.log('Failed to save search:', saveError);
        // Don't fail the request if saving fails
      }
    }

    return new Response(
      JSON.stringify({
        data: unwrappedData,  // 🔧 Use unwrapped data instead of queryData
        count: unwrappedData?.length || 0,  // 🔧 Use unwrapped length
        sql: result.sql,
        explanation: result.explanation,
        source: 'claude_api'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        sql: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});