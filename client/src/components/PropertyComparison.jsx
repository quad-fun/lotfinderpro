// client/src/components/PropertyComparison.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Grid,
  Divider,
  Chip,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  FaTrash, 
  FaSearch, 
  FaChartBar, 
  FaFileCsv 
} from 'react-icons/fa';
import { useQuery } from 'react-query';

// Import services and utils
import { getPropertyById, searchPropertiesByBbl } from '../services/supabaseService';
import { exportPropertiesToCSV } from '../utils/exportUtils';

// Format currency values
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format number values
const formatNumber = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
};

function PropertyComparison({ initialProperties = [] }) {
  const [properties, setProperties] = useState(initialProperties);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Helper function to check if we should highlight a value as the best
  const isBestValue = (field, value, isHigherBetter = true) => {
    if (value === null || value === undefined || properties.length < 2) return false;
    
    const values = properties.map(p => p[field]).filter(v => v !== null && v !== undefined);
    
    if (values.length === 0) return false;
    
    return isHigherBetter 
      ? value === Math.max(...values)
      : value === Math.min(...values);
  };

  // Add a property to comparison
  const addProperty = (property) => {
    if (!property) return;
    
    // Check if already in the list
    if (properties.some(p => p.id === property.id)) {
      return;
    }
    
    setProperties([...properties, property]);
    setDialogOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove a property from comparison
  const removeProperty = (propertyId) => {
    setProperties(properties.filter(p => p.id !== propertyId));
  };

  // Handle property search
  const handlePropertySearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      // Try to parse as BBL first
      const bbl = parseInt(searchQuery.replace(/[-\s]/g, ''), 10);
      
      if (!isNaN(bbl)) {
        const results = await searchPropertiesByBbl(bbl);
        setSearchResults(results);
      } else {
        // TODO: Implement address search when available
        setSearchError('Please enter a valid BBL number');
      }
    } catch (error) {
      console.error('Property search error:', error);
      setSearchError('Error searching for properties');
    } finally {
      setSearchLoading(false);
    }
  };

  // Export comparison to CSV
  const exportComparison = () => {
    if (properties.length === 0) return;
    
    exportPropertiesToCSV(properties, 'property-comparison');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Property Comparison
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<FaSearch />}
            onClick={() => setDialogOpen(true)}
          >
            Add Property
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<FaFileCsv />}
            onClick={exportComparison}
            disabled={properties.length === 0}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      {properties.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            No properties selected for comparison.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<FaSearch />}
            onClick={() => setDialogOpen(true)}
          >
            Add Property
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Property</strong></TableCell>
                {properties.map((property) => (
                  <TableCell key={property.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2">
                        {property.address || `BBL: ${property.bbl}`}
                      </Typography>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => removeProperty(property.id)}
                      >
                        <FaTrash />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {property.borough}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Basic Information */}
              <TableRow>
                <TableCell colSpan={properties.length + 1} sx={{ backgroundColor: '#f5f5f5' }}>
                  <Typography variant="subtitle1"><strong>Basic Information</strong></Typography>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>BBL</TableCell>
                {properties.map((property) => (
                  <TableCell key={`bbl-${property.id}`}>{property.bbl}</TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Zoning District</TableCell>
                {properties.map((property) => (
                  <TableCell key={`zone-${property.id}`}>{property.zonedist1 || 'N/A'}</TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Lot Area (sq ft)</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`lotarea-${property.id}`}
                    sx={isBestValue('lotarea', property.lotarea) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {formatNumber(property.lotarea)}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Building Area (sq ft)</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`bldgarea-${property.id}`}
                    sx={isBestValue('bldgarea', property.bldgarea) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {formatNumber(property.bldgarea)}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Year Built</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`yearbuilt-${property.id}`}
                    sx={isBestValue('yearbuilt', property.yearbuilt) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {property.yearbuilt || 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
              
              {/* Financial Information */}
              <TableRow>
                <TableCell colSpan={properties.length + 1} sx={{ backgroundColor: '#f5f5f5' }}>
                  <Typography variant="subtitle1"><strong>Financial Information</strong></Typography>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Land Value</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`assessland-${property.id}`}
                    sx={isBestValue('assessland', property.assessland, false) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {formatCurrency(property.assessland)}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Total Value</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`assesstot-${property.id}`}
                    sx={isBestValue('assesstot', property.assesstot, false) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {formatCurrency(property.assesstot)}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Value per Sq Ft</TableCell>
                {properties.map((property) => {
                  const valuePerSqFt = property.lotarea && property.assesstot 
                    ? property.assesstot / property.lotarea 
                    : null;
                  
                  return (
                    <TableCell 
                      key={`valuepsf-${property.id}`}
                      sx={isBestValue('assesstot', valuePerSqFt, false) ? { backgroundColor: '#e8f5e9' } : {}}
                    >
                      {valuePerSqFt ? formatCurrency(valuePerSqFt) : 'N/A'}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {/* Development Metrics */}
              <TableRow>
                <TableCell colSpan={properties.length + 1} sx={{ backgroundColor: '#f5f5f5' }}>
                  <Typography variant="subtitle1"><strong>Development Metrics</strong></Typography>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Built FAR</TableCell>
                {properties.map((property) => (
                  <TableCell key={`builtfar-${property.id}`}>
                    {property.builtfar?.toFixed(2) || 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Maximum Residential FAR</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`residfar-${property.id}`}
                    sx={isBestValue('residfar', property.residfar) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {property.residfar?.toFixed(2) || 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Development Potential (sq ft)</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`devpot-${property.id}`}
                    sx={isBestValue('development_potential', property.development_potential) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {formatNumber(property.development_potential)}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Land-to-Value Ratio</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`valueratio-${property.id}`}
                    sx={isBestValue('value_ratio', property.value_ratio) ? { backgroundColor: '#e8f5e9' } : {}}
                  >
                    {property.value_ratio?.toFixed(2) || 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Add Property Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Property to Comparison</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Search by BBL"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter BBL (e.g., 1-00123-0045)"
              InputProps={{
                endAdornment: (
                  <Button
                    onClick={handlePropertySearch}
                    disabled={searchLoading}
                    sx={{ ml: 1 }}
                  >
                    {searchLoading ? <CircularProgress size={24} /> : 'Search'}
                  </Button>
                )
              }}
              sx={{ mb: 2 }}
            />
            
            {searchError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {searchError}
              </Alert>
            )}
            
            {searchResults.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Search Results
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {searchResults.map((result) => (
                  <Box 
                    key={result.id} 
                    sx={{ 
                      p: 2, 
                      mb: 1, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={8}>
                        <Typography variant="subtitle1">
                          {result.address || `BBL: ${result.bbl}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {result.borough}, {result.zonedist1 || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => addProperty(result)}
                        >
                          Add
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PropertyComparison;