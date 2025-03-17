// supabase/functions/data-loader/index.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLUTO_API_URL = 'https://data.cityofnewyork.us/resource/64uk-42ks.json';

serve(async (req) => {
  try {
    // Initialize Supabase client with environment variables
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    // Admin authentication for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get request parameters
    const { method } = await req.json();
    
    // Handle different methods
    if (method === 'incrementalLoad') {
      return await handleIncrementalLoad(supabaseAdmin);
    } else if (method === 'fullLoad') {
      return await handleFullLoad(supabaseAdmin);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid method' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function handleIncrementalLoad(supabaseAdmin) {
  // Get the last update timestamp
  const { data: lastUpdate, error: lastUpdateError } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'last_pluto_update')
    .single();
  
  if (lastUpdateError && lastUpdateError.code !== 'PGRST116') {
    throw new Error(`Failed to get last update: ${lastUpdateError.message}`);
  }
  
  const lastUpdateDate = lastUpdate ? new Date(lastUpdate.value) : new Date(0);
  const lastUpdateString = lastUpdateDate.toISOString();
  
  // Fetch updated records from PLUTO API
  let offset = 0;
  const limit = 1000; // API limit
  let totalProcessed = 0;
  
  while (true) {
    const url = `${PLUTO_API_URL}?$where=last_status_date>'${lastUpdateString}'&$limit=${limit}&$offset=${offset}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || data.length === 0) {
      break;
    }
    
    // Process and insert/update records
    await processRecords(supabaseAdmin, data);
    
    totalProcessed += data.length;
    offset += limit;
    
    // Stop if we've reached the end
    if (data.length < limit) {
      break;
    }
  }
  
  // Update the last update timestamp
  await supabaseAdmin
    .from('system_settings')
    .upsert({ 
      key: 'last_pluto_update',
      value: new Date().toISOString()
    });
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Incremental load completed. Processed ${totalProcessed} records.` 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleFullLoad(supabaseAdmin) {
  // Warning: This is a resource-intensive operation
  // Truncate the properties table first
  await supabaseAdmin.rpc('truncate_properties');
  
  let offset = 0;
  const limit = 1000; // API limit
  let totalProcessed = 0;
  
  while (true) {
    const url = `${PLUTO_API_URL}?$limit=${limit}&$offset=${offset}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || data.length === 0) {
      break;
    }
    
    // Process and insert records
    await processRecords(supabaseAdmin, data);
    
    totalProcessed += data.length;
    offset += limit;
    
    // Stop if we've reached the end
    if (data.length < limit) {
      break;
    }
  }
  
  // Update the last update timestamp
  await supabaseAdmin
    .from('system_settings')
    .upsert({ 
      key: 'last_pluto_update',
      value: new Date().toISOString()
    });
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Full load completed. Processed ${totalProcessed} records.` 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

async function processRecords(supabaseAdmin, records) {
  // Transform PLUTO data to match our schema
  const transformedRecords = records.map(record => ({
    bbl: parseInt(record.bbl, 10),
    borough: getBoroughName(record.borough),
    block: parseInt(record.block, 10),
    lot: parseInt(record.lot, 10),
    address: record.address,
    zipcode: record.zipcode,
    zonedist1: record.zonedist1,
    bldgclass: record.bldgclass,
    landuse: record.landuse,
    ownertype: record.ownertype,
    lotarea: parseFloat(record.lotarea),
    bldgarea: parseFloat(record.bldgarea),
    comarea: parseFloat(record.comarea),
    resarea: parseFloat(record.resarea),
    officearea: parseFloat(record.officearea),
    retailarea: parseFloat(record.retailarea),
    garagearea: parseFloat(record.garagearea),
    strgearea: parseFloat(record.strgearea),
    factryarea: parseFloat(record.factryarea),
    numfloors: parseFloat(record.numfloors),
    unitstotal: parseInt(record.unitstotal, 10),
    unitsres: parseInt(record.unitsres, 10),
    yearbuilt: parseInt(record.yearbuilt, 10),
    yearalter1: parseInt(record.yearalter1, 10),
    yearalter2: parseInt(record.yearalter2, 10),
    builtfar: parseFloat(record.builtfar),
    residfar: parseFloat(record.residfar),
    commfar: parseFloat(record.commfar),
    facilfar: parseFloat(record.facilfar),
    assessland: parseFloat(record.assessland),
    assesstot: parseFloat(record.assesstot),
    exemptland: parseFloat(record.exemptland),
    exempttot: parseFloat(record.exempttot),
    landmark: record.landmark,
    built_status: getBuiltStatus(record),
    // Convert geometry from the API if available
    geom: record.the_geom ? 
          `SRID=4326;${record.the_geom.replace('MULTIPOLYGON', 'POLYGON')}` : 
          null,
    centroid: record.the_geom_centroid ? 
             `SRID=4326;${record.the_geom_centroid}` : 
             null
  }));
  
  // Insert or update records in batches
  const batchSize = 100;
  for (let i = 0; i < transformedRecords.length; i += batchSize) {
    const batch = transformedRecords.slice(i, i + batchSize);
    
    const { error } = await supabaseAdmin
      .from('properties')
      .upsert(batch, { 
        onConflict: 'bbl',
        ignoreDuplicates: false
      });
    
    if (error) {
      throw new Error(`Failed to insert/update records: ${error.message}`);
    }
  }
}

function getBoroughName(boroughCode) {
  const boroughMap = {
    '1': 'Manhattan',
    '2': 'Bronx',
    '3': 'Brooklyn',
    '4': 'Queens',
    '5': 'Staten Island'
  };
  
  return boroughMap[boroughCode] || boroughCode;
}

function getBuiltStatus(record) {
  if (record.bldgclass?.startsWith('V')) {
    return 'vacant';
  } else if (parseInt(record.yearbuilt, 10) === 0) {
    return 'vacant';
  } else if (parseInt(record.bldgarea, 10) === 0) {
    return 'vacant';
  }
  
  return 'built';
}