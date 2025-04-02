// supabase/functions/nlp-query/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Function to translate natural language to SQL using Anthropic's Claude API
async function translateNaturalLanguageToSQL(query: string) {
  const apiKey = Deno.env.get("CLAUDE_API_KEY");
  if (!apiKey) {
    console.error("Missing CLAUDE_API_KEY environment variable");
    // Fall back to rule-based approach if API key is missing
    return fallbackTranslation(query);
  }

  const systemPrompt = `You are an AI that converts natural language queries about real estate properties into SQL queries.

Your task is to translate a user's question about properties into a valid SQL query that can be run against a PostgreSQL database.

The main table is called "properties" and has the following key columns:
- bbl: Borough, Block, and Lot identifier (unique)
- borough: Borough name (Manhattan, Brooklyn, Bronx, Queens, Staten Island)
- block: Tax block number
- lot: Tax lot number
- address: Street address
- zipcode: ZIP code
- zonedist1: Primary zoning district
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
- builtfar: Built Floor Area Ratio
- residfar: Maximum allowed residential FAR
- assessland: Assessed land value
- assesstot: Total assessed value
- built_status: Either 'built' or 'vacant'
- development_potential: Calculated as (residfar - builtfar) * lotarea

Your response should be JSON formatted with these fields:
- sql: The SQL query to execute
- explanation: A plain English explanation of how you interpreted the query

Always limit results to 100 records maximum to prevent performance issues.
Use ORDER BY when appropriate to show the most relevant results first.
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
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*}/);
                        
      let jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      
      // Clean up any remaining markdown or text
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n|```\n|```/g, '');
      }
      
      const parsedResult = JSON.parse(jsonStr);
      
      // Validate the result has the expected structure
      if (!parsedResult.sql || !parsedResult.explanation) {
        throw new Error("Response missing required fields");
      }
      
      return parsedResult;
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      // Fallback to a simple query if parsing fails
      return fallbackTranslation(query);
    }
  } catch (error) {
    console.error("Error calling Claude API:", error);
    // Fallback to the rule-based approach as a backup
    return fallbackTranslation(query);
  }
}

// The original rule-based function as a fallback
function fallbackTranslation(query: string) {
  console.log("Using fallback translation for query:", query);
  
  // This is the original rule-based implementation
  const query_lower = query.toLowerCase();
  let sql = "";
  let explanation = "";
  
  // Pattern matching for common queries
  if (query_lower.includes("vacant") && query_lower.includes("lot")) {
    sql = `SELECT * FROM properties WHERE built_status = 'vacant' LIMIT 100`;
    explanation = "I found properties that are vacant lots.";
    
    // Add borough filter
    if (query_lower.includes("brooklyn")) {
      sql = `SELECT * FROM properties WHERE built_status = 'vacant' AND borough = 'Brooklyn' LIMIT 100`;
      explanation = "I found vacant lots in Brooklyn.";
    } else if (query_lower.includes("manhattan")) {
      sql = `SELECT * FROM properties WHERE built_status = 'vacant' AND borough = 'Manhattan' LIMIT 100`;
      explanation = "I found vacant lots in Manhattan.";
    } else if (query_lower.includes("bronx")) {
      sql = `SELECT * FROM properties WHERE built_status = 'vacant' AND borough = 'Bronx' LIMIT 100`;
      explanation = "I found vacant lots in the Bronx.";
    } else if (query_lower.includes("queens")) {
      sql = `SELECT * FROM properties WHERE built_status = 'vacant' AND borough = 'Queens' LIMIT 100`;
      explanation = "I found vacant lots in Queens.";
    } else if (query_lower.includes("staten island")) {
      sql = `SELECT * FROM properties WHERE built_status = 'vacant' AND borough = 'Staten Island' LIMIT 100`;
      explanation = "I found vacant lots in Staten Island.";
    }
    
    // Add size filter
    if (query_lower.includes("over") || query_lower.includes("more than")) {
      const sizeMatch = query.match(/(\d[\d,]*) sq(uare)? f(ee)?t/i) || query.match(/(\d[\d,]*) sf/i) || query.match(/(over|more than) (\d[\d,]*)/i);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1].replace(/,/g, ''));
        sql = sql.replace("WHERE", `WHERE lotarea > ${size} AND`);
        explanation += ` I filtered for lots larger than ${size.toLocaleString()} square feet.`;
      }
    }
  } else if (query_lower.includes("commercial") && (query_lower.includes("propert") || query_lower.includes("building"))) {
    sql = `SELECT * FROM properties WHERE bldgclass LIKE 'G%' OR bldgclass LIKE 'O%' OR bldgclass LIKE 'K%' LIMIT 100`;
    explanation = "I found commercial properties.";
    
    // Add year built filter
    if (query_lower.includes("before")) {
      const yearMatch = query.match(/before (\d{4})/i);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        sql = sql.replace("WHERE", `WHERE yearbuilt < ${year} AND`);
        explanation += ` I filtered for properties built before ${year}.`;
      }
    }
    
    // Add assessment value filter
    if (query_lower.includes("low") && query_lower.includes("value")) {
      sql = sql.replace("LIMIT 100", "ORDER BY assesstot ASC LIMIT 100");
      explanation += " I sorted by lowest assessed value.";
    }
  } else if (query_lower.includes("development potential") || (query_lower.includes("high") && query_lower.includes("far"))) {
    sql = `SELECT * FROM properties WHERE residfar > builtfar AND builtfar > 0 ORDER BY (residfar - builtfar) DESC LIMIT 100`;
    explanation = "I found properties with high development potential (underbuilt relative to zoning allowance).";
  } else if (query_lower.includes("residential") && query_lower.includes("low far")) {
    sql = `SELECT * FROM properties 
           WHERE residfar > 0 
           AND builtfar > 0 
           AND builtfar < residfar * 0.5 
           AND (bldgclass LIKE 'A%' OR bldgclass LIKE 'B%' OR bldgclass LIKE 'C%' OR bldgclass LIKE 'D%')`;
    
    // Add borough filter
    if (query_lower.includes("manhattan")) {
      sql = sql.replace("WHERE", "WHERE borough = 'Manhattan' AND");
      explanation = "I found residential properties in Manhattan with low Floor Area Ratio (underbuilt).";
    } else {
      explanation = "I found residential properties with low Floor Area Ratio (underbuilt).";
    }
    sql += " LIMIT 100";
  } else {
    // Default search
    sql = `SELECT * FROM properties LIMIT 100`;
    explanation = "I performed a basic property search.";
    
    // Try to extract keywords
    if (query.match(/\w+/)) {
      const keywords = query.match(/\w+/g);
      if (keywords) {
        explanation = `I searched for properties matching your query about: ${keywords.join(", ")}.`;
      }
    }
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, X-Client-Info",
        "Access-Control-Max-Age": "86400" // 24 hours
      }
    });
  }
  
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
    
    // Translate natural language to SQL (now using Anthropic's Claude)
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