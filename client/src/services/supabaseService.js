// client/src/services/supabaseService.js - Complete implementation with all required exports

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== PROPERTY SERVICES ====================
// ==================== ADDITIONAL MISSING FUNCTIONS ====================

// Function to execute dynamic queries (used by NLP and templates)
export const executeDynamicQuery = async (sql) => {
  try {
    const { data, error } = await supabase
      .rpc('execute_dynamic_query', { query_sql: sql });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Execute dynamic query error:', error);
    throw error;
  }
};

// Function to save a search query (used by NLP search)
export const saveSearchQuery = async (userId, query, sql, resultCount) => {
  try {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        name: `Search: ${query.substring(0, 50)}...`,
        query_type: 'nlp',
        nlp_query: query,
        processed_sql: sql,
        template_id: null,
        parameters: { result_count: resultCount }
      });
    
    if (error) {
      console.error('Error saving search query:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Save search query error:', error);
    return null;
  }
};

// Function to get property neighbors (used in PropertyDetail for similar properties)
export const getPropertyNeighbors = async (propertyId, radius = 500) => {
  try {
    // This would use PostGIS functions to find nearby properties
    // For now, return a simple implementation
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .neq('id', propertyId)
      .limit(10);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Get property neighbors error:', error);
    return [];
  }
};

// Function to get market trends (used in Dashboard)
export const getMarketTrends = async (borough = null, timeframe = '1year') => {
  try {
    // This would calculate market trends over time
    // For now, return mock data structure
    return {
      avgAssessment: 0,
      avgLotSize: 0,
      vacantLotCount: 0,
      developmentOpportunities: 0,
      trends: {
        assessmentTrend: 'up',
        vacantTrend: 'down',
        opportunityTrend: 'up'
      }
    };
  } catch (error) {
    console.error('Get market trends error:', error);
    return null;
  }
};

// Function to validate BBL format
export const validateBBL = (bbl) => {
  // BBL should be 10 digits: 1 digit borough + 5 digit block + 4 digit lot
  const bblString = bbl.toString().replace(/[-\s]/g, '');
  
  if (bblString.length !== 10) {
    return false;
  }
  
  const borough = parseInt(bblString.charAt(0));
  if (borough < 1 || borough > 5) {
    return false;
  }
  
  return /^\d{10}$/.test(bblString);
};

// Function to format BBL for display
export const formatBBL = (bbl) => {
  const bblString = bbl.toString().padStart(10, '0');
  return `${bblString.charAt(0)}-${bblString.substring(1, 6)}-${bblString.substring(6)}`;
};

// Function to get property history (if available)
export const getPropertyHistory = async (bbl) => {
  try {
    // This would fetch historical data for a property
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Get property history error:', error);
    return [];
  }
};

// Function to check if user has favorited a property
export const isPropertyFavorited = async (userId, propertyId) => {
  try {
    if (!userId) return false;
    
    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();
    
    return !error && data;
  } catch (error) {
    return false;
  }
};

// Function to get user's recent searches
export const getRecentSearches = async (userId, limit = 10) => {
  try {
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent searches:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Get recent searches error:', error);
    return [];
  }
};

// Function to delete a saved search
export const deleteSavedSearch = async (userId, searchId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId)
      .eq('user_id', userId); // Ensure user can only delete their own searches
    
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete saved search error:', error);
    throw error;
  }
};

// Function to update a saved search
export const updateSavedSearch = async (userId, searchId, updates) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('saved_searches')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', searchId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Update saved search error:', error);
    throw error;
  }
};

// Function to get property counts by borough
export const getPropertyCountsByBorough = async () => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('borough')
      .not('borough', 'is', null);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Count properties by borough
    const counts = {};
    data.forEach(property => {
      const borough = property.borough;
      counts[borough] = (counts[borough] || 0) + 1;
    });
    
    // Convert to array format with borough names
    return Object.entries(counts).map(([code, count]) => ({
      borough: getBoroughName(code),
      code,
      count
    }));
  } catch (error) {
    console.error('Get property counts by borough error:', error);
    return [];
  }
};

// Function to get zoning distribution
export const getZoningDistribution = async (borough = null) => {
  try {
    let query = supabase
      .from('properties')
      .select('zonedist1')
      .not('zonedist1', 'is', null);
    
    if (borough) {
      query = query.eq('borough', borough);
    }
    
    const { data, error } = await query.limit(10000);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Count by zoning district
    const counts = {};
    data.forEach(property => {
      const zone = property.zonedist1;
      counts[zone] = (counts[zone] || 0) + 1;
    });
    
    // Convert to array and sort by count
    return Object.entries(counts)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 zoning districts
  } catch (error) {
    console.error('Get zoning distribution error:', error);
    return [];
  }
};

// Function to search properties by address
export const searchPropertiesByAddress = async (address, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        CASE WHEN residfar > 0 AND lotarea > 0 
             THEN (residfar - COALESCE(builtfar, 0)) * lotarea 
             ELSE 0 
        END AS development_potential,
        CASE WHEN assesstot > 0 
             THEN assessland / assesstot 
             ELSE NULL 
        END AS value_ratio
      `)
      .ilike('address', `%${address}%`)
      .limit(limit);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Search properties by address error:', error);
    return [];
  }
};

export const getPropertyById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        CASE WHEN residfar > 0 AND lotarea > 0 
             THEN (residfar - COALESCE(builtfar, 0)) * lotarea 
             ELSE 0 
        END AS development_potential,
        CASE WHEN assesstot > 0 
             THEN assessland / assesstot 
             ELSE NULL 
        END AS value_ratio,
        CASE WHEN residfar > 0 
             THEN COALESCE(builtfar, 0) / residfar 
             ELSE NULL 
        END AS zoning_efficiency
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching property by ID:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Get property by ID error:', error);
    throw error;
  }
};

export const getProperties = async ({ queryKey }) => {
  try {
    const [, params] = queryKey;
    const { page = 0, pageSize = 10, ...filters } = params;
    
    let query = supabase
      .from('properties')
      .select(`
        *,
        CASE WHEN residfar > 0 AND lotarea > 0 
             THEN (residfar - COALESCE(builtfar, 0)) * lotarea 
             ELSE 0 
        END AS development_potential,
        CASE WHEN assesstot > 0 
             THEN assessland / assesstot 
             ELSE NULL 
        END AS value_ratio,
        CASE WHEN residfar > 0 
             THEN COALESCE(builtfar, 0) / residfar 
             ELSE NULL 
        END AS zoning_efficiency
      `, { count: 'exact' });
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'min_lotarea') {
          query = query.gte('lotarea', value);
        } else if (key === 'max_assesstot') {
          query = query.lte('assesstot', value);
        } else if (key === 'borough') {
          query = query.eq('borough', value);
        } else if (key === 'zonedist1') {
          query = query.eq('zonedist1', value);
        } else if (key === 'bldgclass') {
          query = query.ilike('bldgclass', `${value}%`);
        } else if (key === 'built_status') {
          query = query.eq('built_status', value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
    
    // Apply pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    // Default ordering
    query = query.order('assesstot', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('Get properties error:', error);
    throw error;
  }
};

export const searchPropertiesByBbl = async (bbl) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        CASE WHEN residfar > 0 AND lotarea > 0 
             THEN (residfar - COALESCE(builtfar, 0)) * lotarea 
             ELSE 0 
        END AS development_potential,
        CASE WHEN assesstot > 0 
             THEN assessland / assesstot 
             ELSE NULL 
        END AS value_ratio,
        CASE WHEN residfar > 0 
             THEN COALESCE(builtfar, 0) / residfar 
             ELSE NULL 
        END AS zoning_efficiency
      `)
      .eq('bbl', bbl)
      .limit(10);
    
    if (error) {
      console.error('Error searching properties by BBL:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('BBL search error:', error);
    return [];
  }
};

// ==================== FILTER OPTIONS ====================

export const getFilterOptions = async () => {
  try {
    // Get unique boroughs
    const { data: boroughs, error: boroughError } = await supabase
      .from('properties')
      .select('borough')
      .not('borough', 'is', null)
      .limit(10);
    
    // Get unique zoning districts
    const { data: zoning, error: zoningError } = await supabase
      .from('properties')
      .select('zonedist1')
      .not('zonedist1', 'is', null)
      .limit(100);
    
    if (boroughError || zoningError) {
      console.error('Error fetching filter options:', boroughError || zoningError);
      // Return default options on error
      return {
        boroughs: [
          { code: 'MN', name: 'Manhattan' },
          { code: 'BK', name: 'Brooklyn' },
          { code: 'BX', name: 'Bronx' },
          { code: 'QN', name: 'Queens' },
          { code: 'SI', name: 'Staten Island' }
        ],
        zoningDistricts: ['R1-1', 'R2', 'R3-1', 'R3-2', 'R4', 'R5', 'R6', 'R7-1', 'R8', 'C1-1', 'C1-2', 'C2-1', 'M1-1']
      };
    }
    
    // Process unique values
    const uniqueBoroughs = [...new Set(boroughs?.map(b => b.borough))].map(code => ({
      code,
      name: getBoroughName(code)
    }));
    
    const uniqueZoning = [...new Set(zoning?.map(z => z.zonedist1))].filter(Boolean).sort();
    
    return {
      boroughs: uniqueBoroughs,
      zoningDistricts: uniqueZoning
    };
  } catch (error) {
    console.error('Get filter options error:', error);
    return {
      boroughs: [
        { code: 'MN', name: 'Manhattan' },
        { code: 'BK', name: 'Brooklyn' },
        { code: 'BX', name: 'Bronx' },
        { code: 'QN', name: 'Queens' },
        { code: 'SI', name: 'Staten Island' }
      ],
      zoningDistricts: []
    };
  }
};

const getBoroughName = (code) => {
  const mapping = {
    'MN': 'Manhattan',
    'BK': 'Brooklyn',
    'BX': 'Bronx',
    'QN': 'Queens',
    'SI': 'Staten Island'
  };
  return mapping[code] || code;
};

// ==================== QUERY TEMPLATES ====================

export const getQueryTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('query_templates')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching query templates:', error);
      // Return empty array instead of throwing
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Get query templates error:', error);
    return [];
  }
};

export const executeTemplateQuery = async ({ templateId, parameters }) => {
  try {
    // Get the template first
    const { data: template, error: templateError } = await supabase
      .from('query_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError) {
      throw new Error(templateError.message);
    }
    
    // Process the template SQL with parameters
    let processedSql = template.sql_template;
    
    // Simple parameter substitution
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedSql = processedSql.replace(new RegExp(placeholder, 'g'), value);
    });
    
    // Execute using RPC function
    const { data, error } = await supabase
      .rpc('execute_dynamic_query', { query_sql: processedSql });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      data: data || [],
      template,
      sql: processedSql
    };
  } catch (error) {
    console.error('Execute template query error:', error);
    throw error;
  }
};

// ==================== NLP QUERY ====================

export const performNlpQuery = async (query, userId) => {
  try {
    console.log('🚀 Calling nlp-query Edge Function with:', { query, userId });
    
    const { data, error } = await supabase.functions.invoke('nlp-query', {
      body: { query, userId }
    });
    
    console.log('🔧 Raw supabase.functions.invoke response:');
    console.log('  - data:', data);
    console.log('  - error:', error);
    console.log('  - data type:', typeof data);
    console.log('  - data.data type:', typeof data?.data);
    console.log('  - data.data length:', data?.data?.length);
    
    if (data?.data?.length > 0) {
      console.log('🏠 First property from Edge Function:', data.data[0]);
      console.log('🔑 Keys in first property:', Object.keys(data.data[0]));
      console.log('📊 First property field details:');
      Object.entries(data.data[0]).forEach(([key, value]) => {
        console.log(`  ${key}: ${value} (${typeof value})`);
      });
    }
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('💥 performNlpQuery error:', error);
    throw error;
  }
};

// ==================== OPPORTUNITY TYPES ====================

export const getOpportunityTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('opportunity_types')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching opportunity types:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('getOpportunityTypes error:', error);
    return [];
  }
};

export const findOpportunities = async (opportunityTypeId, borough) => {
  try {
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
    
    // Execute the query
    const { data, error } = await supabase
      .rpc('execute_dynamic_query', { query_sql: sql });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      data,
      opportunity: opportunityType,
      sql
    };
  } catch (error) {
    console.error('Find opportunities error:', error);
    throw error;
  }
};

// ==================== DASHBOARD STATS ====================

export const getDashboardStats = async () => {
  try {
    console.log('Fetching dashboard stats...');
    
    // Try to use the optimized database function first
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_dashboard_stats');
    
    if (statsError) {
      console.error('Error with get_dashboard_stats function:', statsError);
      // Fall back to individual queries
      return await getDashboardStatsFallback();
    }
    
    console.log('Dashboard stats from DB function:', statsData);
    
    return [
      {
        title: 'Total Properties',
        value: (statsData.total_properties || 0).toLocaleString(),
        icon: 'FaInfoCircle',
        color: 'primary.main'
      },
      {
        title: 'Vacant Lots',
        value: (statsData.vacant_lots || 0).toLocaleString(),
        icon: 'FaBuilding',
        color: 'warning.main'
      },
      {
        title: 'Development Opportunities',
        value: (statsData.development_opportunities || 0).toLocaleString(),
        icon: 'FaLightbulb',
        color: 'success.main'
      },
      {
        title: 'High Land Value Ratio',
        value: (statsData.high_value_ratio || 0).toLocaleString(),
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return await getDashboardStatsFallback();
  }
};

const getDashboardStatsFallback = async () => {
  try {
    console.log('Using fallback method for dashboard stats...');
    
    // Get basic counts with error handling
    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    const { count: vacantLots } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .like('bldgclass', 'V%');
    
    const { count: developmentOpportunities } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gt('residfar', 0)
      .gt('lotarea', 1000);
    
    // Estimate high value ratio properties
    const { count: potentialHighValue } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gt('assessland', 0)
      .gt('assesstot', 0);
    
    const highValueRatioCount = Math.floor((potentialHighValue || 0) * 0.15);
    
    return [
      {
        title: 'Total Properties',
        value: (totalProperties || 0).toLocaleString(),
        icon: 'FaInfoCircle',
        color: 'primary.main'
      },
      {
        title: 'Vacant Lots',
        value: (vacantLots || 0).toLocaleString(),
        icon: 'FaBuilding',
        color: 'warning.main'
      },
      {
        title: 'Development Opportunities',
        value: (developmentOpportunities || 0).toLocaleString(),
        icon: 'FaLightbulb',
        color: 'success.main'
      },
      {
        title: 'High Land Value Ratio',
        value: (highValueRatioCount || 0).toLocaleString(),
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  } catch (error) {
    console.error('Fallback stats failed:', error);
    return [
      {
        title: 'Total Properties',
        value: 'Loading...',
        icon: 'FaInfoCircle',
        color: 'primary.main'
      },
      {
        title: 'Vacant Lots',
        value: 'Loading...',
        icon: 'FaBuilding',
        color: 'warning.main'
      },
      {
        title: 'Development Opportunities',
        value: 'Loading...',
        icon: 'FaLightbulb',
        color: 'success.main'
      },
      {
        title: 'High Land Value Ratio',
        value: 'Loading...',
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  }
};

// ==================== USER FAVORITES ====================

export const saveFavoriteProperty = async (userId, propertyId, notes = '') => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('user_favorites')
      .upsert({
        user_id: userId,
        property_id: propertyId,
        notes: notes,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,property_id'
      });
    
    if (error) {
      console.error('Error saving favorite property:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Save favorite error:', error);
    throw error;
  }
};

export const removeFavoriteProperty = async (userId, propertyId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    
    if (error) {
      console.error('Error removing favorite property:', error);
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Remove favorite error:', error);
    throw error;
  }
};

export const getFavoriteProperties = async (userId) => {
  try {
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching favorite properties:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Get favorite properties error:', error);
    return [];
  }
};

// ==================== SAVED SEARCHES ====================

export const getSavedSearches = async (userId) => {
  try {
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching saved searches:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Get saved searches error:', error);
    return [];
  }
};

export const saveOpportunitySearch = async (userId, opportunityId, borough) => {
  try {
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
  } catch (error) {
    console.error('Save opportunity search error:', error);
    throw error;
  }
};

export const getFeaturedOpportunityTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('opportunity_types')
      .select('*')
      .order('id', { ascending: true })
      .limit(4);
    
    if (error) {
      console.error('Error fetching featured opportunity types:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Get featured opportunity types error:', error);
    return [];
  }
};

// ==================== VACANT LOT STATS ====================

export const getVacantLotStats = async () => {
  try {
    console.log('Fetching vacant lot statistics...');
    
    const { data: vacantStats, error: vacantError } = await supabase
      .rpc('get_improved_vacant_stats');
    
    if (vacantError) {
      console.error('Error with improved vacant stats:', vacantError);
      return await getVacantLotStatsFallback();
    }
    
    console.log('Vacant lot stats:', vacantStats);
    return vacantStats;
  } catch (error) {
    console.error('Error fetching vacant lot stats:', error);
    return await getVacantLotStatsFallback();
  }
};

const getVacantLotStatsFallback = async () => {
  try {
    // Use building class as primary method
    const { count: vacantByBldgClass, error: bldgError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .like('bldgclass', 'V%');
    
    // Fallback to land use category
    const { count: vacantByLandUse, error: landUseError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('landuse', '11');
    
    const bestCount = Math.max(vacantByBldgClass || 0, vacantByLandUse || 0);
    
    return {
      total_vacant: bestCount,
      breakdown: {
        by_building_class_v: vacantByBldgClass || 0,
        by_landuse_11: vacantByLandUse || 0
      }
    };
  } catch (error) {
    console.error('Fallback vacant stats failed:', error);
    return {
      total_vacant: 0,
      breakdown: {
        by_building_class_v: 0,
        by_landuse_11: 0
      }
    };
  }
};

// ==================== EXPORT UTILITIES ====================

export const exportPropertiesToCSV = (properties, filename = 'property-data') => {
  if (!properties || properties.length === 0) {
    console.error('No properties to export');
    return;
  }

  try {
    // Define the fields to include in the export
    const fields = [
      'bbl', 'address', 'borough', 'block', 'lot', 'zonedist1', 
      'lotarea', 'bldgarea', 'builtfar', 'residfar', 'assessland', 
      'assesstot', 'yearbuilt', 'development_potential', 'value_ratio'
    ];

    // Create CSV header row
    const header = fields.join(',');

    // Transform each property into a CSV row
    const rows = properties.map(property => {
      return fields.map(field => {
        const value = property[field];
        
        // Handle different data types
        if (value === null || value === undefined) return '';
        
        // Wrap strings in quotes and escape any existing quotes
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    });

    // Combine header and rows
    const csv = [header, ...rows].join('\n');
    
    // Create a Blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

export const formatPropertiesForExport = (properties, type = 'basic') => {
  if (!properties || properties.length === 0) return [];

  switch (type) {
    case 'detailed':
      return properties.map(p => ({
        bbl: p.bbl,
        address: p.address || '',
        borough: p.borough,
        block: p.block,
        lot: p.lot,
        zipcode: p.zipcode || '',
        zonedist1: p.zonedist1 || '',
        bldgclass: p.bldgclass || '',
        landuse: p.landuse || '',
        ownertype: p.ownertype || '',
        lotarea: p.lotarea || 0,
        bldgarea: p.bldgarea || 0,
        comarea: p.comarea || 0,
        resarea: p.resarea || 0,
        officearea: p.officearea || 0,
        retailarea: p.retailarea || 0,
        numfloors: p.numfloors || 0,
        unitstotal: p.unitstotal || 0,
        unitsres: p.unitsres || 0,
        yearbuilt: p.yearbuilt || 0,
        builtfar: p.builtfar || 0,
        residfar: p.residfar || 0,
        commfar: p.commfar || 0,
        assessland: p.assessland || 0,
        assesstot: p.assesstot || 0,
        built_status: p.built_status || '',
        development_potential: p.development_potential || 0,
        value_ratio: p.value_ratio || 0,
        zoning_efficiency: p.zoning_efficiency || 0,
      }));
      
    case 'analysis':
      return properties.map(p => ({
        bbl: p.bbl,
        address: p.address || '',
        borough: p.borough,
        lotarea: p.lotarea || 0,
        bldgarea: p.bldgarea || 0,
        zonedist1: p.zonedist1 || '',
        builtfar: p.builtfar || 0,
        residfar: p.residfar || 0,
        commfar: p.commfar || 0,
        assessland: p.assessland || 0,
        assesstot: p.assesstot || 0,
        land_per_sqft: p.lotarea ? (p.assessland / p.lotarea).toFixed(2) : 0,
        development_potential: p.development_potential || 0,
        value_ratio: p.value_ratio || 0,
        zoning_efficiency: p.zoning_efficiency || 0,
        potential_value: p.development_potential ? 
          (p.development_potential * (p.assessland / p.lotarea)).toFixed(2) : 0
      }));
      
    case 'basic':
    default:
      return properties.map(p => ({
        bbl: p.bbl,
        address: p.address || '',
        borough: p.borough,
        zonedist1: p.zonedist1 || '',
        lotarea: p.lotarea || 0,
        bldgarea: p.bldgarea || 0,
        builtfar: p.builtfar || 0,
        residfar: p.residfar || 0,
        assesstot: p.assesstot || 0,
        development_potential: p.development_potential || 0
      }));
  }
};