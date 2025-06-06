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
  Grid,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  FaTrash, 
  FaSearch, 
  FaFileCsv 
} from 'react-icons/fa';

// Import only the functions we know exist
import { getPropertyById } from '../services/supabaseService';

// Simple BBL search function using direct Supabase query
const searchPropertiesByBbl = async (bbl) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/properties?bbl=eq.${bbl}&limit=10`, {
      headers: {
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to search properties');
    }
    
    return await response.json();
  } catch (error) {
    console.error('BBL search error:', error);
    return [];
  }
};

// Simple CSV export function
const exportPropertiesToCSV = (properties, filename) => {
  if (!properties || properties.length === 0) return;
  
  try {
    // Get all unique keys from all properties
    const allKeys = [...new Set(properties.flatMap(p => Object.keys(p)))];
    
    // Create CSV content
    const headers = allKeys.join(',');
    const rows = properties.map(property => 
      allKeys.map(key => {
        const value = property[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('CSV export error:', error);
    alert('Failed to export CSV');
  }
};

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
        setSearchResults(results || []);
      } else {
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
                    sx={isBestValue('lotarea', property.lotarea) ? { backgroundColor: '#e8f5e8' } : {}}
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
                    sx={isBestValue('bldgarea', property.bldgarea) ? { backgroundColor: '#e8f5e8' } : {}}
                  >
                    {formatNumber(property.bldgarea)}
                  </TableCell>
                ))}
              </TableRow>
              
              {/* Assessment Values */}
              <TableRow>
                <TableCell colSpan={properties.length + 1} sx={{ backgroundColor: '#f5f5f5' }}>
                  <Typography variant="subtitle1"><strong>Assessment Values</strong></Typography>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell>Land Value</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`assessland-${property.id}`}
                    sx={isBestValue('assessland', property.assessland) ? { backgroundColor: '#e8f5e8' } : {}}
                  >
                    {formatCurrency(property.assessland)}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Total Assessment</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`assesstot-${property.id}`}
                    sx={isBestValue('assesstot', property.assesstot) ? { backgroundColor: '#e8f5e8' } : {}}
                  >
                    {formatCurrency(property.assesstot)}
                  </TableCell>
                ))}
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
                    {property.builtfar ? property.builtfar.toFixed(2) : 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Residential FAR</TableCell>
                {properties.map((property) => (
                  <TableCell key={`residfar-${property.id}`}>
                    {property.residfar ? property.residfar.toFixed(2) : 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
              
              <TableRow>
                <TableCell>Development Potential</TableCell>
                {properties.map((property) => (
                  <TableCell 
                    key={`devpot-${property.id}`}
                    sx={isBestValue('development_potential', property.development_potential) ? { backgroundColor: '#e8f5e8' } : {}}
                  >
                    {formatNumber(property.development_potential)}
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
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="BBL Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., 1000123456"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePropertySearch();
                }
              }}
              InputProps={{
                endAdornment: (
                  <Button
                    onClick={handlePropertySearch}
                    disabled={searchLoading}
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