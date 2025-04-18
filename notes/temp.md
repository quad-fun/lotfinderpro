// client/src/services/supabaseService.js
// Add to the existing services:

// Enhanced version of findOpportunities function
export const findOpportunities = async (opportunityTypeId, borough) => {
  // First, get the opportunity type
  const { data: opportunityType, error: oppError } = await supabase
    .from('opportunity_types')
    .select('*')
    .eq('id', opportunityTypeId)
    .single();
  
  if (oppError) {
    throw new Error(oppError.message);
  }
  
  // Construct SQL query with borough filter if provided
  let sql = `
    SELECT p.*, 
           CASE WHEN p.residfar > 0 AND p.lotarea > 0 
                THEN (p.residfar - COALESCE(p.builtfar, 0)) * p.lotarea 
                ELSE 0 
           END AS development_potential,
           CASE WHEN p.assesstot > 0 
                THEN p.assessland / p.assesstot 
                ELSE NULL 
           END AS value_ratio,
           CASE WHEN p.residfar > 0 
                THEN COALESCE(p.builtfar, 0) / p.residfar 
                ELSE NULL 
           END AS zoning_efficiency
    FROM properties p
    WHERE ${opportunityType.criteria}
  `;
  
  if (borough) {
    sql += ` AND p.borough = '${borough.replace(/'/g, "''")}'`;
  }
  
  // Add sorting based on opportunity type
  if (opportunityType.name.toLowerCase().includes('vacant')) {
    sql += ' ORDER BY p.lotarea DESC';
  } else if (opportunityType.name.toLowerCase().includes('underbuilt')) {
    sql += ' ORDER BY development_potential DESC';
  } else if (opportunityType.name.toLowerCase().includes('value')) {
    sql += ' ORDER BY value_ratio DESC';
  } else {
    sql += ' ORDER BY p.assesstot DESC';
  }
  
  sql += ' LIMIT 100';
  // client/src/services/supabaseService.js (continued)
  
  // Execute the query
  const { data, error } = await supabase
    .rpc('execute_dynamic_query', { query_sql: sql });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return {
    data,
    opportunity: opportunityType,
    sql // include SQL for debugging purposes
  };
};

// Add a function to save an opportunity search
export const saveOpportunitySearch = async (userId, opportunityId, borough) => {
  if (!userId) return null;
  
  // Get the opportunity type name for the search name
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunity_types')
    .select('name')
    .eq('id', opportunityId)
    .single();
  
  if (oppError) {
    throw new Error(oppError.message);
  }
  
  // Create a name for the saved search
  const searchName = borough 
    ? `${opportunity.name} in ${borough}` 
    : opportunity.name;
  
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: userId,
      name: searchName,
      query_type: 'opportunity',
      template_id: null,
      parameters: { opportunityId, borough },
      nlp_query: null,
      processed_sql: null
    });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Add a function to get featured opportunity types
export const getFeaturedOpportunityTypes = async () => {
  const { data, error } = await supabase
    .from('opportunity_types')
    .select('*')
    .order('id', { ascending: true })
    .limit(4);  // Just get the top 4 for featured display
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};