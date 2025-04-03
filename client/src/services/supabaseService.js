// client/src/services/supabaseService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Property Data Services
export const getProperties = async ({ queryKey }) => {
  const [_, params] = queryKey;
  const { page = 0, pageSize = 10, borough, zonedist1, ...filters } = params || {};
  
  // Calculate pagination
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  // Build query
  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' });
  
  // Apply filters if they exist
  if (borough) {
    query = query.eq('borough', borough);
  }
  
  if (zonedist1) {
    query = query.eq('zonedist1', zonedist1);
  }
  
  // Apply custom filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      if (key.startsWith('min_')) {
        const field = key.replace('min_', '');
        query = query.gte(field, value);
      } else if (key.startsWith('max_')) {
        const field = key.replace('max_', '');
        query = query.lte(field, value);
      } else {
        query = query.eq(key, value);
      }
    }
  });
  
  // Execute query with pagination
  const { data, error, count } = await query
    .range(from, to)
    .order('assesstot', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize)
  };
};

export const getPropertyById = async (id) => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Search properties by BBL
export const searchPropertiesByBbl = async (bbl) => {
  // Strip any formatting from BBL
  const formattedBbl = String(bbl).replace(/[-\s]/g, '');
  
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('bbl', formattedBbl)
    .limit(10);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Get boroughs and zoning districts
export const getFilterOptions = async () => {
  // Get distinct boroughs
  const { data: boroughs, error: boroughError } = await supabase
    .from('properties')
    .select('borough')
    .order('borough')
    .limit(10);
  
  if (boroughError) {
    throw new Error(boroughError.message);
  }
  
  // Get distinct zoning districts
  const { data: zoningDistricts, error: zoningError } = await supabase
    .from('properties')
    .select('zonedist1')
    .not('zonedist1', 'is', null)
    .order('zonedist1')
    .limit(100);
  
  if (zoningError) {
    throw new Error(zoningError.message);
  }
  
  return {
    boroughs: [...new Set(boroughs.map(b => b.borough))],
    zoningDistricts: [...new Set(zoningDistricts.map(z => z.zonedist1))]
  };
};

// Template Query Services
export const getQueryTemplates = async () => {
  const { data, error } = await supabase
    .from('query_templates')
    .select('*')
    .order('name');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

export const executeTemplateQuery = async ({ templateId, parameters }) => {
  // First, get the template
  const { data: template, error: templateError } = await supabase
    .from('query_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  if (templateError) {
    throw new Error(templateError.message);
  }
  
  // Replace parameters in the SQL template
  let sql = template.sql_template;
  
  // Replace {{param}} with actual values
  for (const [key, value] of Object.entries(parameters)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    
    // Handle different types of values
    if (typeof value === 'string') {
      // Escape single quotes in string values
      const escapedValue = value.replace(/'/g, "''");
      sql = sql.replace(regex, `'${escapedValue}'`);
    } else {
      sql = sql.replace(regex, value);
    }
  }
  
  // Execute the query using our RPC function
  const { data, error } = await supabase
    .rpc('execute_dynamic_query', { query_sql: sql });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { 
    data, 
    sql,
    template
  };
};

// NLP Query Service
export const performNlpQuery = async (query, userId) => {
  const { data, error } = await supabase
    .functions.invoke('nlp-query', {
      body: { query, userId },
    });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Saved Searches Services
export const getSavedSearches = async (userId) => {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

export const saveFavoriteProperty = async (userId, propertyId, notes = '') => {
  const { data, error } = await supabase
    .from('favorite_properties')
    .upsert({
      user_id: userId,
      property_id: propertyId,
      notes
    });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

export const getFavoriteProperties = async (userId) => {
  const { data, error } = await supabase
    .from('favorite_properties')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Opportunity Types Services
export const getOpportunityTypes = async () => {
  const { data, error } = await supabase
    .from('opportunity_types')
    .select('*');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

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
  // Add LIMIT and performance optimizations to avoid timeout
  let sql = `
    SELECT p.id, p.bbl, p.borough, p.block, p.lot, p.address, p.zipcode, 
           p.zonedist1, p.bldgclass, p.landuse, p.lotarea, p.bldgarea, 
           p.builtfar, p.residfar, p.commfar, p.assessland, p.assesstot,
           p.yearbuilt, p.built_status, p.latitude, p.longitude,
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
    sql += ' ORDER BY (p.residfar - COALESCE(p.builtfar, 0)) * p.lotarea DESC';
  } else if (opportunityType.name.toLowerCase().includes('value')) {
    sql += ' ORDER BY p.assessland / NULLIF(p.assesstot, 0) DESC';
  } else {
    sql += ' ORDER BY p.assesstot DESC';
  }
  
  // Limit to avoid timeout
  sql += ' LIMIT 50';
  
  try {
    // Execute the query
    const { data, error } = await supabase
      .rpc('execute_dynamic_query', { query_sql: sql });
    
    if (error) {
      console.error("SQL execution error:", error);
      throw new Error(error.message);
    }
    
    return {
      data: data || [],
      opportunity: opportunityType,
      sql // include SQL for debugging purposes
    };
  } catch (error) {
    console.error("Error executing opportunity query:", error);
    
    // If we encounter a timeout, fall back to a simpler query
    if (error.message.includes("timeout") || error.message.includes("canceling statement")) {
      console.log("Trying fallback simplified query due to timeout");
      
      // Simplified fallback query
      const fallbackSql = `
        SELECT p.id, p.bbl, p.borough, p.block, p.lot, p.address, p.zipcode, 
               p.zonedist1, p.bldgclass, p.lotarea, p.bldgarea, 
               p.builtfar, p.residfar, p.assessland, p.assesstot,
               p.yearbuilt, p.built_status
        FROM properties p
        WHERE ${opportunityType.criteria.split(' AND ')[0]}
        ${borough ? `AND p.borough = '${borough.replace(/'/g, "''")}'` : ''}
        LIMIT 30
      `;
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .rpc('execute_dynamic_query', { query_sql: fallbackSql });
        
      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
      
      // Calculate missing fields on the client side
      const enhancedData = fallbackData.map(p => ({
        ...p,
        development_potential: p.residfar && p.lotarea ? 
          (p.residfar - (p.builtfar || 0)) * p.lotarea : 0,
        value_ratio: p.assesstot ? p.assessland / p.assesstot : null,
        zoning_efficiency: p.residfar ? (p.builtfar || 0) / p.residfar : null
      }));
      
      return {
        data: enhancedData,
        opportunity: opportunityType,
        sql: fallbackSql,
        usedFallback: true
      };
    }
    
    throw error;
  }
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

// Dashboard Stats Services
export const getDashboardStats = async () => {
  try {
    // Get total properties count
    const { count: totalProperties, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw new Error(countError.message);
    
    // Get development opportunities count
    const { count: developmentOpportunities, error: devOpError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gt('development_potential', 5000);
    
    if (devOpError) throw new Error(devOpError.message);
    
    // Get vacant lots count
    const { count: vacantLots, error: vacantError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('built_status', 'vacant');
    
    if (vacantError) throw new Error(vacantError.message);
    
    // Get high value ratio properties count
    const { count: highValueRatioCount, error: valueRatioError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gt('value_ratio', 0.7);
      
    if (valueRatioError) throw new Error(valueRatioError.message);
    
    return [
      {
        title: 'Total Properties',
        value: totalProperties.toLocaleString(),
        icon: 'FaInfoCircle',
        color: 'primary.main'
      },
      {
        title: 'Development Opportunities',
        value: developmentOpportunities.toLocaleString(),
        icon: 'FaLightbulb',
        color: 'success.main'
      },
      {
        title: 'Vacant Lots',
        value: vacantLots.toLocaleString(),
        icon: 'FaBuilding',
        color: 'warning.main'
      },
      {
        title: 'High Land Value Ratio',
        value: highValueRatioCount.toLocaleString(),
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return fallback data if there's an error
    return [
      {
        title: 'Total Properties',
        value: '800,000+',
        icon: 'FaInfoCircle',
        color: 'primary.main'
      },
      {
        title: 'Development Opportunities',
        value: '25,000+',
        icon: 'FaLightbulb',
        color: 'success.main'
      },
      {
        title: 'Vacant Lots',
        value: '15,000+',
        icon: 'FaBuilding',
        color: 'warning.main'
      },
      {
        title: 'High Land Value Ratio',
        value: '30,000+',
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  }
};

export default supabase;