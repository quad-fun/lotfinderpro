// supabase/functions/nlp-query/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Function to translate natural language to SQL using Anthropic's Claude API
async function translateNaturalLanguageToSQL(query: string) {
  const apiKey = Deno.env.get("CLAUDE_API_KEY");
  console.log("Claude API Key present:", !!apiKey);
  
  if (!apiKey) {
    console.error("Missing CLAUDE_API_KEY environment variable");
    // Fall back to rule-based approach if API key is missing
    return fallbackTranslation(query, "missing API key");
  }

  const systemPrompt = `You are an AI that converts natural language queries about real estate properties into SQL queries.

Your task is to translate a user's question about properties into a valid SQL query that can be run against a PostgreSQL database.

The main table is called "properties" and has the following key columns:
- bbl: Borough, Block, and Lot identifier (unique)
- borough: Borough code (MN = Manhattan, BX = Bronx, BK = Brooklyn, QN = Queens, SI = Staten Island)
- block: Tax block number
- lot: Tax lot number
- address: Street address
- zipcode: ZIP code
- zonedist1: Primary zoning district (e.g. R3-2, C1-9, M1-1)
- bldgclass: Building class code
- landuse: Land use category
- lotarea: Lot area in square feet
- bldgarea: Building area in square feet
- comarea: Commercial area
- resarea: Residential area
- numfloors: Number of floors
- unitstotal: Total units
- unitsres: Residential units
- yearbuilt: Year built
- builtfar: Built Floor Area Ratio (current FAR)
- residfar: Maximum allowed residential FAR (maximum FAR allowed by zoning)
- commfar: Maximum allowed commercial FAR
- assessland: Assessed land value
- assesstot: Total assessed value (land + improvements)
- built_status: Either 'built' or 'vacant'
- development_potential: Calculated as (residfar - builtfar) * lotarea

IMPORTANT: Always use the correct borough codes when filtering by location:
- For "in Manhattan", add WHERE borough = 'MN'
- For "in Brooklyn", add WHERE borough = 'BK'
- For "in the Bronx" or "in Bronx", add WHERE borough = 'BX'
- For "in Queens", add WHERE borough = 'QN'
- For "in Staten Island", add WHERE borough = 'SI'

IMPORTANT: When filtering properties based on builtfar or development_potential, be aware that some properties might have NULL values for these fields. Consider using IS NULL conditions appropriately.

For example, instead of just:
WHERE builtfar < residfar * 0.5

Consider using:
WHERE (builtfar IS NULL OR builtfar < residfar * 0.5)

This will include properties that might be vacant or have no recorded building information.

For property value concepts:
- "High value ratio" or "land value ratio" refers to properties where assessland/assesstot is high (> 0.7)
- "Value per square foot" is calculated as assesstot/lotarea

For zoning and development concepts:
- "Underdeveloped" or "underutilized" properties: WHERE (builtfar IS NULL OR builtfar < residfar * 0.5) AND residfar > 0
- "Development potential": WHERE development_potential > 0 ORDER BY development_potential DESC
- "Zoning efficiency": properties using a low percentage of their maximum allowed FAR
- "Air rights": properties with unused development rights (residfar > builtfar)

For mixed-use queries, combine appropriate conditions:
- "Residential properties in Brooklyn with development potential": 
  WHERE borough = 'BK' AND (bldgclass LIKE 'A%' OR bldgclass LIKE 'B%' OR bldgclass LIKE 'C%' OR bldgclass LIKE 'D%') AND development_potential > 0

Always include appropriate sorting (ORDER BY) when it makes sense:
- For investment properties, sort by value metrics
- For development opportunities, sort by development_potential
- For inquiries about specific areas, prioritize larger or more valuable properties

Your response should be JSON formatted with these fields:
- sql: The SQL query to execute
- explanation: A plain English explanation of how you interpreted the query

Always limit results to 100 records maximum to prevent performance issues.
Make sure your SQL is valid PostgreSQL syntax.`;

  const userMessage = `Convert this natural language query about properties to SQL: "${query}"`;

  try {
    // Call Anthropic's Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Claude response received");

    // Extract the JSON response from Claude
    try {
      // Claude sometimes adds markdown formatting, so we need to extract just the JSON part
      const content = result.content[0].text;
      
      // Log the full content for debugging
      console.log("Claude raw response:", content);
      
      // Try to extract JSON from the response with multiple patterns
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*?}/);
                        
      let jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      
      // Clean up any remaining markdown or text
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n|```\n|```/g, '');
      }
      
      // Add fallback values in case parsing still fails
      let parsedResult;
      try {
        parsedResult = JSON.parse(jsonStr);
      } catch (innerParseError) {
        console.error("JSON parse error, trying to extract manually:", innerParseError);
        
        // Try to manually extract SQL and explanation with regex
        const sqlMatch = content.match(/sql['"]*:\s*['"]([\s\S]*?)['"],/i) || 
                         content.match(/sql['"]*:\s*['"]([\s\S]*?)['"]}/i);
        const explanationMatch = content.match(/explanation['"]*:\s*['"]([\s\S]*?)['"]/i);
        
        if (sqlMatch && explanationMatch) {
          parsedResult = {
            sql: sqlMatch[1],
            explanation: explanationMatch[1]
          };
        } else {
          throw new Error("Could not extract SQL and explanation from response");
        }
      }
      
      // Validate the result has the expected structure
      if (!parsedResult.sql) {
        throw new Error("Response missing SQL field");
      }
      
      if (!parsedResult.explanation) {
        parsedResult.explanation = "I analyzed your query about properties and created a database search.";
      }
      
      return parsedResult;
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      // Fallback to a simple query if parsing fails
      return fallbackTranslation(query, "parsing error: " + parseError.message);
    }
  } catch (error) {
    console.error("Error calling Claude API:", error);
    // Fallback to the rule-based approach as a backup
    return fallbackTranslation(query, "API call error: " + error.message);
  }
}

// Helper function to get borough name from code
function getBoroughName(code) {
  const boroughMap = {
    'MN': 'Manhattan',
    'BX': 'Bronx',
    'BK': 'Brooklyn',
    'QN': 'Queens',
    'SI': 'Staten Island'
  };
  return boroughMap[code] || code;
}

// Enhanced rule-based fallback function
function fallbackTranslation(query: string, reason = "unknown") {
  console.log(`Using fallback translation for query: "${query}". Reason: ${reason}`);
  
  const query_lower = query.toLowerCase();
  let sql = "";
  let explanation = "";
  
  // Extract potential borough using correct borough codes
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
  
  // Extract potential zoning districts
  let zoningDistrict = null;
  const zoningMatch = query_lower.match(/r\d-?\d?|c\d-?\d?|m\d-?\d?/i);
  if (zoningMatch) {
    zoningDistrict = zoningMatch[0].toUpperCase();
  }
  
  // Handle different property type queries
  if (query_lower.includes("underdevelop") || 
      query_lower.includes("under-develop") || 
      query_lower.includes("underutilized") || 
      query_lower.includes("under-utilized") ||
      query_lower.includes("development potential")) {
    sql = `SELECT * FROM properties 
           WHERE (builtfar IS NULL OR builtfar < residfar * 0.8) 
           AND residfar > 0`;
    explanation = "I found properties that are underdeveloped (with significant development potential).";
    
    // Sort by development potential
    sql += " ORDER BY development_potential DESC";
  }
  else if (query_lower.includes("vacant") && query_lower.includes("lot")) {
    sql = `SELECT * FROM properties WHERE built_status = 'vacant'`;
    explanation = "I found properties that are vacant lots.";
  }
  else if (query_lower.includes("commercial") && 
          (query_lower.includes("property") || query_lower.includes("building") || query_lower.includes("properties"))) {
    sql = `SELECT * FROM properties WHERE 
          (bldgclass LIKE 'G%' OR bldgclass LIKE 'O%' OR bldgclass LIKE 'K%') 
          AND built_status = 'built'`;
    explanation = "I found commercial properties.";
    
    if (query_lower.includes("value") && (query_lower.includes("high") || query_lower.includes("valuable"))) {
      sql += " ORDER BY assesstot DESC";
      explanation += " I sorted by highest total value.";
    }
  }
  else if (query_lower.includes("residential") && 
          (query_lower.includes("property") || query_lower.includes("building") || query_lower.includes("properties"))) {
    sql = `SELECT * FROM properties WHERE 
          (bldgclass LIKE 'A%' OR bldgclass LIKE 'B%' OR bldgclass LIKE 'C%' OR bldgclass LIKE 'D%') 
          AND built_status = 'built'`;
    explanation = "I found residential properties.";
    
    // Handle specific residential property queries
    if (query_lower.includes("multi-family") || query_lower.includes("multifamily") || 
        query_lower.includes("multi family") || query_lower.includes("apartment")) {
      sql = sql.replace("bldgclass LIKE 'A%' OR ", ""); // Remove single family
      explanation = "I found multi-family residential properties.";
    }
    else if (query_lower.includes("single family") || query_lower.includes("one family") || 
             query_lower.includes("single-family") || query_lower.includes("one-family")) {
      sql = `SELECT * FROM properties WHERE bldgclass LIKE 'A%' AND built_status = 'built'`;
      explanation = "I found single-family residential properties.";
    }
  }
  else if (query_lower.includes("mixed use") || query_lower.includes("mixed-use")) {
    sql = `SELECT * FROM properties WHERE bldgclass LIKE 'R%' OR landuse = '04'`;
    explanation = "I found mixed-use (residential and commercial) properties.";
  }
  else if (query_lower.includes("high") && query_lower.includes("value") && query_lower.includes("ratio")) {
    sql = `SELECT * FROM properties WHERE value_ratio > 0.7 AND assesstot > 0`;
    explanation = "I found properties with a high land-to-total value ratio (over 70%).";
    sql += " ORDER BY value_ratio DESC";
  }
  else if (query_lower.includes("air rights") || 
           query_lower.includes("development rights") || 
           query_lower.includes("transfer")) {
    sql = `SELECT * FROM properties WHERE residfar > builtfar * 1.5 AND builtfar > 0 AND residfar > 0`;
    explanation = "I found properties with significant unused development rights (air rights).";
    sql += " ORDER BY (residfar - builtfar) * lotarea DESC";
  }
  else if (query_lower.includes("old") || query_lower.includes("historic")) {
    let year = 1950; // Default
    const yearMatch = query_lower.match(/before (\d{4})/);
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
    } else if (query_lower.includes("pre-war") || query_lower.includes("prewar")) {
      year = 1945;
    }
    
    sql = `SELECT * FROM properties WHERE yearbuilt < ${year} AND yearbuilt > 0 AND built_status = 'built'`;
    explanation = `I found properties built before ${year}.`;
  }
  else if (query_lower.includes("large") && query_lower.includes("lot")) {
    let size = 5000; // Default square feet
    const sizeMatch = query_lower.match(/(\d[\d,]*) sq(uare)? f(ee)?t/i) || 
                      query_lower.match(/(\d[\d,]*) sf/i);
    if (sizeMatch) {
      size = parseInt(sizeMatch[1].replace(/,/g, ''));
    }
    
    sql = `SELECT * FROM properties WHERE lotarea > ${size}`;
    explanation = `I found properties with lot size greater than ${size.toLocaleString()} square feet.`;
    sql += " ORDER BY lotarea DESC";
  }
  else {
    // Default query
    sql = `SELECT * FROM properties`;
    explanation = "I performed a basic property search.";
    
    // Try to extract keywords
    if (query.match(/\w+/)) {
      const keywords = query.match(/\w+/g);
      if (keywords) {
        explanation = `I searched for properties matching your query about: ${keywords.join(", ")}.`;
      }
    }
  }
  
  // Add borough filter if detected
  if (borough) {
    sql = sql.includes("WHERE") 
      ? sql.replace("WHERE", `WHERE borough = '${borough}' AND`) 
      : `${sql} WHERE borough = '${borough}'`;
    explanation = explanation.replace("I found", `I found ${getBoroughName(borough)}`);
  }
  
  // Add zoning district filter if detected
  if (zoningDistrict) {
    sql = sql.includes("WHERE") 
      ? sql.replace("WHERE", `WHERE zonedist1 LIKE '${zoningDistrict}%' AND`) 
      : `${sql} WHERE zonedist1 LIKE '${zoningDistrict}%'`;
    explanation += ` in ${zoningDistrict} zoning districts`;
  }
  
  // Add size filter if present
  if (query_lower.includes("over") || 
      query_lower.includes("more than") || 
      query_lower.includes("larger than") || 
      query_lower.includes("bigger than")) {
    const sizeMatch = query.match(/(\d[\d,]*) sq(uare)? f(ee)?t/i) || 
                      query.match(/(\d[\d,]*) sf/i) || 
                      query.match(/(over|more than|larger than|bigger than) (\d[\d,]*)/i);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]?.replace(/,/g, '') || sizeMatch[2]?.replace(/,/g, '') || '0');
      if (size > 0) {
        sql = sql.includes("WHERE") 
          ? sql.replace("WHERE", `WHERE lotarea > ${size} AND`) 
          : `${sql} WHERE lotarea > ${size}`;
        explanation += ` I filtered for lots larger than ${size.toLocaleString()} square feet.`;
      }
    }
  }
  
  // Add value filter if present
  if (query_lower.includes("under") && 
     (query_lower.includes("million") || query_lower.includes("$"))) {
    const valueMatch = query.match(/under \$?(\d[\d,]*) million/i) || 
                       query.match(/less than \$?(\d[\d,]*) million/i) ||
                       query.match(/under \$?(\d[\d,]*)/i);
    if (valueMatch) {
      let value = parseInt(valueMatch[1].replace(/,/g, ''));
      if (query_lower.includes("million")) {
        value = value * 1000000;
      } else {
        value = value * 1; // ensure it's a number
      }
      
      sql = sql.includes("WHERE") 
        ? sql.replace("WHERE", `WHERE assesstot < ${value} AND`) 
        : `${sql} WHERE assesstot < ${value}`;
      explanation += ` I filtered for properties valued under $${(value/1000000).toFixed(1)} million.`;
    }
  }
  
  // Add year built filter if present
  if (query_lower.includes("built after") || query_lower.includes("newer than")) {
    const yearMatch = query.match(/(built after|newer than) (\d{4})/i);
    if (yearMatch) {
      const year = parseInt(yearMatch[2]);
      sql = sql.includes("WHERE") 
        ? sql.replace("WHERE", `WHERE yearbuilt > ${year} AND yearbuilt > 0 AND`) 
        : `${sql} WHERE yearbuilt > ${year} AND yearbuilt > 0`;
      explanation += ` I filtered for properties built after ${year}.`;
    }
  }
  
  // Add limit
  if (!sql.includes("LIMIT")) {
    sql += " LIMIT 100";
  }
  
  return {
    sql,
    explanation
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*", // This allows any domain to access the function
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, X-Client-Info",
        "Access-Control-Max-Age": "86400"
      }
    });
  }
  
  // Also update the success response to include CORS headers
  return new Response(JSON.stringify({
    // your response data
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" // This allows any domain to access the function
    }
  });
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    
    console.log("Supabase URL:", supabaseUrl ? "Present" : "Missing");
    console.log("Supabase Key:", supabaseKey ? "Present" : "Missing");
    console.log("Claude API Key:", claudeApiKey ? "Present" : "Missing");
    
    // Check if Authorization header exists and use it if available
    const authHeader = req.headers.get('Authorization');
    let apiKey = supabaseKey;
    if (authHeader) {
      const match = authHeader.match(/^Bearer (.+)$/);
      if (match) {
        apiKey = match[1];
        console.log("Using API key from Authorization header");
      }
    }
    
    if (!supabaseUrl || !apiKey) {
      return new Response(JSON.stringify({
        error: "Missing Supabase credentials"
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 500
      });
    }
    
    const supabase = createClient(supabaseUrl, apiKey);
    
    // Parse request
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request parsed successfully");
    } catch (parseError) {
      console.error("Error parsing request:", parseError.message);
      return new Response(JSON.stringify({
        error: `Request parsing error: ${parseError.message}`
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 400
      });
    }
    
    const { query, userId } = requestBody;
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({
        error: "Invalid query parameter"
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 400
      });
    }
    
    // Translate natural language to SQL
    let translationResult;
    try {
      translationResult = await translateNaturalLanguageToSQL(query);
      console.log("Translation result generated");
    } catch (translationError) {
      console.error("Translation error:", translationError.message);
      return new Response(JSON.stringify({
        error: `Translation error: ${translationError.message}`
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 500
      });
    }
    
    const { sql, explanation } = translationResult;
    
    // Validate SQL to ensure it's not dangerous
    if (!sql.toLowerCase().includes('select')) {
      return new Response(JSON.stringify({
        error: "Invalid SQL query: must be a SELECT statement",
        sql
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 400
      });
    }
    
    // Execute the query using the database function
    let queryResult;
    try {
      console.log("Executing SQL:", sql);
      queryResult = await supabase.rpc('execute_dynamic_query', {
        query_sql: sql
      });
      
      console.log("Query execution result status:", queryResult.error ? "Error" : "Success");
      if (queryResult.error) {
        console.error("Query execution error:", queryResult.error.message);
      } else {
        console.log("Data received from database function");
      }
    } catch (queryError) {
      console.error("RPC execution error:", queryError.message);
      return new Response(JSON.stringify({
        error: `RPC execution error: ${queryError.message}`,
        sql
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 500
      });
    }
    
    const { data, error } = queryResult;
    if (error) {
      return new Response(JSON.stringify({
        error: `Query execution error: ${error.message}`,
        sql
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 500
      });
    }
    
    // Save search if user is logged in
    if (userId) {
      try {
        const saveResult = await supabase.from('saved_searches').insert({
          user_id: userId,
          name: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
          query_type: 'nlp',
          nlp_query: query,
          processed_sql: sql
        });
        if (saveResult.error) {
          console.error("Error saving search:", saveResult.error.message);
        }
      } catch (saveError) {
        console.error("Error during save operation:", saveError.message);
        // Don't return an error here - just log it and continue
      }
    }
    
    return new Response(JSON.stringify({
      results: data || [],
      count: Array.isArray(data) ? data.length : 0,
      explanation,
      sql
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
    
  } catch (error) {
    console.error("Server error:", error.message);
    return new Response(JSON.stringify({
      error: `Server error: ${error.message}`
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      status: 500
    });
  }
});