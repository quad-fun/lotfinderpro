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

// NEW FUNCTION: Search properties by BBL
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

// NEW FUNCTION: Get boroughs and zoning districts
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
export const executeNlpQuery = async (query, userId) => {
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
    SELECT * FROM properties 
    WHERE ${opportunityType.criteria}
  `;
  
  if (borough) {
    sql += ` AND borough = '${borough}'`;
  }
  
  sql += ' LIMIT 100';
  
  // Execute the query
  const { data, error } = await supabase
    .rpc('execute_dynamic_query', { query_sql: sql });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return {
    data,
    opportunity: opportunityType
  };
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
      .eq('built_status', 'vacant')
      .gt('lotarea', 2000);
    
    if (devOpError) throw new Error(devOpError.message);
    
    // Get vacant lots count
    const { count: vacantLots, error: vacantError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('built_status', 'vacant');
    
    if (vacantError) throw new Error(vacantError.message);
    
    // Get NYC value ratio avg
    const { data: valueRatioData, error: valueRatioError } = await supabase
      .from('properties')
      .select('assesstot, assessland')
      .not('assesstot', 'is', null)
      .not('assessland', 'is', null)
      .gt('assesstot', 0)
      .limit(1000);
      
    if (valueRatioError) throw new Error(valueRatioError.message);
    
    // Calculate average value ratio
    const valueRatios = valueRatioData.map(p => p.assessland / p.assesstot).filter(v => !isNaN(v) && isFinite(v));
    const valueRatioAvg = valueRatios.length ? 
      (valueRatios.reduce((sum, val) => sum + val, 0) / valueRatios.length).toFixed(2) : 
      '0.00';
    
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
        icon: 'FaInfoCircle',
        color: 'warning.main'
      },
      {
        title: 'NYC Value Ratio Avg',
        value: valueRatioAvg,
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return [];
  }
};

export default supabase;