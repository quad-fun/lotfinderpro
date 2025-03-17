// client/src/utils/exportUtils.js

/**
 * Converts a properties array to CSV format and triggers download
 * @param {Array} properties - Array of property objects
 * @param {String} filename - Name of the downloaded file
 */
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
  
  /**
   * Format property data for different export types
   * @param {Array} properties - Array of property objects
   * @param {String} type - Export type (basic, detailed, analysis)
   * @returns {Array} Formatted property data
   */
  export const formatPropertiesForExport = (properties, type = 'basic') => {
    if (!properties || properties.length === 0) return [];
  
    switch (type) {
      case 'detailed':
        // Include more fields for detailed exports
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
        // Include fields focused on development analysis
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
        // Basic fields for simple exports
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