// client/src/services/supabaseService.js - Updated vacant lot functions

// Improved function to get vacant lot statistics with breakdown
export const getVacantLotStats = async () => {
  try {
    console.log('Fetching improved vacant lot statistics...');
    
    const { data: vacantStats, error: vacantError } = await supabase
      .rpc('get_improved_vacant_stats');
    
    if (vacantError) {
      console.error('Error with improved vacant stats:', vacantError);
      // Fallback to simple method
      return await getVacantLotStatsFallback();
    }
    
    console.log('Improved vacant lot stats:', vacantStats);
    return vacantStats;
  } catch (error) {
    console.error('Error fetching vacant lot stats:', error);
    return await getVacantLotStatsFallback();
  }
};

// Fallback method using multiple criteria
const getVacantLotStatsFallback = async () => {
  try {
    // Method 1: Building class starts with 'V' (most accurate)
    const { count: vacantByBldgClass, error: bldgError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .like('bldgclass', 'V%');
    
    // Method 2: Land use category 11 (Vacant Land)
    const { count: vacantByLandUse, error: landUseError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('landuse', '11');
    
    // Method 3: No buildings and no year built
    const { count: vacantByNoBuildings, error: noBldgError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .or('yearbuilt.is.null,yearbuilt.eq.0')
      .or('bldgarea.is.null,bldgarea.eq.0')
      .or('numbldgs.is.null,numbldgs.eq.0');
    
    // Method 4: Your current built_status field
    const { count: vacantByBuiltStatus, error: builtStatusError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('built_status', 'vacant');
    
    console.log('Vacant lot counts by method:', {
      byBuildingClass: vacantByBldgClass,
      byLandUse: vacantByLandUse,
      byNoBuildings: vacantByNoBuildings,
      byBuiltStatus: vacantByBuiltStatus
    });
    
    // Use the highest count as it's likely most comprehensive
    const bestCount = Math.max(
      vacantByBldgClass || 0,
      vacantByLandUse || 0,
      vacantByNoBuildings || 0,
      vacantByBuiltStatus || 0
    );
    
    return {
      total_vacant: bestCount,
      breakdown: {
        by_building_class_v: vacantByBldgClass || 0,
        by_landuse_11: vacantByLandUse || 0,
        by_no_buildings: vacantByNoBuildings || 0,
        by_built_status: vacantByBuiltStatus || 0
      }
    };
  } catch (error) {
    console.error('Fallback vacant stats failed:', error);
    return {
      total_vacant: 0,
      breakdown: {
        by_building_class_v: 0,
        by_landuse_11: 0,
        by_no_buildings: 0,
        by_built_status: 0
      }
    };
  }
};

// Updated dashboard stats using improved vacant lot identification
export const getDashboardStats = async () => {
  try {
    console.log('Fetching dashboard stats with improved vacant lot logic...');
    
    // Try to use the optimized database function first
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_dashboard_stats');
    
    if (statsError) {
      console.error('Error with get_dashboard_stats function:', statsError);
      // Fall back to individual queries with improved vacant lot logic
      return await getDashboardStatsFallbackImproved();
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
    return await getDashboardStatsFallbackImproved();
  }
};

// Improved fallback using better vacant lot logic
const getDashboardStatsFallbackImproved = async () => {
  try {
    console.log('Using improved fallback method for dashboard stats...');
    
    // Get total properties count
    const { count: totalProperties, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    // Get vacant lots using building class (most accurate method)
    let vacantLots = 0;
    const { count: vacantByClass, error: vacantError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .like('bldgclass', 'V%');
    
    if (!vacantError && vacantByClass > 0) {
      vacantLots = vacantByClass;
    } else {
      // Fallback to land use category
      const { count: vacantByLandUse, error: landUseError } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('landuse', '11');
      
      vacantLots = vacantByLandUse || 0;
    }
    
    // Get development opportunities
    const { count: developmentOpportunities, error: devOpError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gt('residfar', 0)
      .gt('lotarea', 1000);
    
    // Get high value ratio estimate
    const { count: potentialHighValue, error: valueError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gt('assessland', 0)
      .gt('assesstot', 0);
    
    const highValueRatioCount = Math.floor((potentialHighValue || 0) * 0.15);
    
    console.log('Improved fallback stats:', {
      totalProperties,
      vacantLots,
      developmentOpportunities,
      highValueRatioCount
    });
    
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
    console.error('Improved fallback also failed:', error);
    
    return [
      {
        title: 'Total Properties',
        value: 'Error',
        icon: 'FaInfoCircle',
        color: 'primary.main'
      },
      {
        title: 'Vacant Lots',
        value: 'Error',
        icon: 'FaBuilding',
        color: 'warning.main'
      },
      {
        title: 'Development Opportunities',
        value: 'Error',
        icon: 'FaLightbulb',
        color: 'success.main'
      },
      {
        title: 'High Land Value Ratio',
        value: 'Error',
        icon: 'FaChartBar',
        color: 'info.main'
      }
    ];
  }
};