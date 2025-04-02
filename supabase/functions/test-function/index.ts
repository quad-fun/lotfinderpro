import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, X-Client-Info",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    // Prepare diagnostic info
    const diagnostics = {
      supabaseUrl: supabaseUrl ? "Present" : "Missing",
      supabaseKey: supabaseKey ? "Present" : "Missing",
      timestamp: new Date().toISOString(),
    };
    
    // Test if Supabase client can be created
    let clientTest = "Not tested";
    let dbTest = "Not tested";
    let rpcTest = "Not tested";
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        clientTest = "Success";
        
        // Test basic database query
        try {
          const { data: testData, error: testError } = await supabase
            .from('properties')
            .select('id')
            .limit(1);
          
          dbTest = testError ? `Error: ${testError.message}` : "Success";
          
          // Test RPC function
          try {
            const { data: rpcData, error: rpcError } = await supabase
              .rpc('execute_dynamic_query', { 
                query_sql: 'SELECT 1 as test' 
              });
            
            rpcTest = rpcError 
              ? `Error: ${rpcError.message}` 
              : `Success: ${JSON.stringify(rpcData)}`;
          } catch (rpcCatchError) {
            rpcTest = `Exception: ${rpcCatchError.message}`;
          }
        } catch (dbCatchError) {
          dbTest = `Exception: ${dbCatchError.message}`;
        }
      } catch (clientError) {
        clientTest = `Error: ${clientError.message}`;
      }
    }
    
    // Return diagnostic information
    return new Response(
      JSON.stringify({
        status: "ok",
        diagnostics,
        tests: {
          client: clientTest,
          database: dbTest,
          rpc: rpcTest
        }
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message,
        stack: error.stack
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
        status: 500
      }
    );
  }
}); 