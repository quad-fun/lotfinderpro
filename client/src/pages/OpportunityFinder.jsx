// client/src/pages/OpportunityFinder.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  MenuItem,
  Paper,
  CircularProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { 
  FaSearch, 
  FaMapMarkerAlt, 
  FaTable, 
  FaInfoCircle,
  FaStar,
  FaFilter
} from 'react-icons/fa';

// Import components and services
import PropertyTable from '../components/PropertyTable';
import PropertyMap from '../components/PropertyMap';
import ExportMenu from '../components/ExportMenu';
import OpportunityAnalytics from '../components/OpportunityAnalytics';
import { getOpportunityTypes, findOpportunities, saveFavoriteProperty } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';

function OpportunityFinder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('table');
  const [selectedType, setSelectedType] = useState('');
  const [borough, setBorough] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [savedOpportunities, setSavedOpportunities] = useState({});
  const [error, setError] = useState(null);
  
  // Get type ID from URL params if present
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get('type');
  
  // Fetch opportunity types
  const { data: opportunityTypes, isLoading } = useQuery(
    'opportunityTypes',
    getOpportunityTypes
  );
  
  // Set selected type from URL parameter
  useEffect(() => {
    if (typeParam && opportunityTypes) {
      setSelectedType(typeParam);
      
      // Auto-search if type is specified in URL
      if (!results) {
        handleSearch();
      }
    }
  }, [typeParam, opportunityTypes]);
  
  // Handle search
  const handleSearch = async () => {
    if (!selectedType) return;
    
    try {
      setIsSearching(true);
      setError(null); // Clear previous errors
      const data = await findOpportunities(selectedType, borough || undefined);
      setResults(data);
    } catch (error) {
      console.error('Error finding opportunities:', error);
      setError(error.message);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Toggle favorite status
  const toggleFavorite = async (propertyId) => {
    if (!user) return;
    
    try {
      // Optimistic UI update
      setSavedOpportunities(prev => ({
        ...prev,
        [propertyId]: !prev[propertyId]
      }));
      
      // Call API to save/unsave
      await saveFavoriteProperty(user.id, propertyId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update on error
      setSavedOpportunities(prev => ({
        ...prev,
        [propertyId]: !prev[propertyId]
      }));
    }
  };
  
  // Render images for opportunity cards
  const getOpportunityImage = (name) => {
    const imageMap = {
      'Vacant Residential Lots': 'https://source.unsplash.com/random?vacant,lot',
      'Underbuilt Commercial Properties': 'https://source.unsplash.com/random?commercial,building',
      'High Land Value Ratio Properties': 'https://source.unsplash.com/random?property,value',
      'Development Rights Transfer Candidates': 'https://source.unsplash.com/random?skyscraper,development'
    };
    
    return imageMap[name] || 'https://source.unsplash.com/random?realestate';
  };
  
  // Format numbers for display
  const formatNumber = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
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
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Opportunity Finder
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Discover properties with development potential based on different criteria.
      </Typography>
      
      {/* Search Controls */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              select
              label="Opportunity Type"
              fullWidth
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={isSearching}
            >
              <MenuItem value="">Select an opportunity type</MenuItem>
              {opportunityTypes?.map((type) => (
                <MenuItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Borough"
              fullWidth
              value={borough}
              onChange={(e) => setBorough(e.target.value)}
              disabled={isSearching}
            >
              <MenuItem value="">All Boroughs</MenuItem>
              <MenuItem value="Manhattan">Manhattan (MN)</MenuItem>
              <MenuItem value="Brooklyn">Brooklyn (BK)</MenuItem>
              <MenuItem value="Bronx">Bronx (BX)</MenuItem>
              <MenuItem value="Queens">Queens (QN)</MenuItem>
              <MenuItem value="Staten Island">Staten Island (SI)</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={isSearching ? <CircularProgress size={24} color="inherit" /> : <FaSearch />}
              onClick={handleSearch}
              disabled={!selectedType || isSearching}
            >
              {isSearching ? "Searching..." : "Find Opportunities"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error.includes("timeout") || error.includes("canceling statement") ? 
            "This search took too long to complete. Please try narrowing your search by selecting a specific borough, or try a different opportunity type." : 
            error
          }
        </Alert>
      )}
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* If no search has been performed yet, show opportunity cards */}
          {!results && (
            <>
              <Typography variant="h5" component="h2" gutterBottom>
                Opportunity Types
              </Typography>
              
              <Grid container spacing={3}>
                {opportunityTypes?.map((opportunity) => (
                  <Grid item xs={12} sm={6} md={3} key={opportunity.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardMedia
                        component="img"
                        height="140"
                        image={getOpportunityImage(opportunity.name)}
                        alt={opportunity.name}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" gutterBottom>
                          {opportunity.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {opportunity.description}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          onClick={() => {
                            setSelectedType(opportunity.id.toString());
                            // Update URL
                            navigate(`/opportunities?type=${opportunity.id}`);
                          }}
                        >
                          Select
                        </Button>
                        <Button 
                          size="small" 
                          color="primary"
                          onClick={() => {
                            setSelectedType(opportunity.id.toString());
                            // Update URL and trigger search
                            navigate(`/opportunities?type=${opportunity.id}`);
                            setTimeout(() => handleSearch(), 0);
                          }}
                        >
                          Find Properties
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
          
          {/* Search Results */}
          {results && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  {results.data.length} Results for "{results.opportunity.name}"
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant={viewMode === 'table' ? 'contained' : 'outlined'}
                    startIcon={<FaTable />}
                    onClick={() => setViewMode('table')}
                  >
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'contained' : 'outlined'}
                    startIcon={<FaMapMarkerAlt />}
                    onClick={() => setViewMode('map')}
                  >
                    Map
                  </Button>
                  
                  {/* Export menu for search results */}
                  <ExportMenu 
                    properties={results.data} 
                    disabled={isSearching} 
                  />
                </Box>
              </Box>
              
              {/* Opportunity Description */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <FaInfoCircle size={20} style={{ marginRight: 8 }} color="#1976d2" />
                  <Typography variant="h6">
                    About This Opportunity
                  </Typography>
                </Box>
                
                <Typography variant="body1" paragraph>
                  {results.opportunity.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Search Criteria:
                    </Typography>
                    <Typography variant="body2" 
                      sx={{ 
                        backgroundColor: '#f5f5f5', 
                        p: 1, 
                        borderRadius: 1,
                        fontFamily: 'monospace'
                      }}
                    >
                      {results.opportunity.criteria}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Key Metrics to Consider:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {results.opportunity.name.toLowerCase().includes('vacant') && (
                        <Chip label="Lot Size" color="primary" variant="outlined" size="small" />
                      )}
                      {results.opportunity.name.toLowerCase().includes('underbuilt') && (
                        <Chip label="FAR Utilization" color="primary" variant="outlined" size="small" />
                      )}
                      {results.opportunity.name.toLowerCase().includes('value') && (
                        <Chip label="Land-to-Value Ratio" color="primary" variant="outlined" size="small" />
                      )}
                      {results.opportunity.name.toLowerCase().includes('development') && (
                        <Chip label="Development Potential" color="primary" variant="outlined" size="small" />
                      )}
                      <Chip label="Assessment" color="primary" variant="outlined" size="small" />
                      <Chip label="Zoning" color="primary" variant="outlined" size="small" />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
              {/* Results Display */}
              {viewMode === 'table' ? (
                <PropertyTable 
                  properties={results.data}
                  page={0}
                  pageSize={10}
                  totalCount={results.data.length}
                  onPageChange={() => {}}
                  onPageSizeChange={() => {}}
                />
              ) : (
                <PropertyMap properties={results.data} />
              )}
              
              {results.data.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    No properties found matching these criteria.
                  </Typography>
                  <Typography variant="body2">
                    Try adjusting your search parameters or selecting a different borough.
                  </Typography>
                  {process.env.NODE_ENV === 'development' && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        Debug info: <br />
                        Opportunity type: {results.opportunity.name} (ID: {results.opportunity.id})<br />
                        Borough: {borough || "All"}<br />
                        SQL: <pre style={{ whiteSpace: 'pre-wrap' }}>{results.sql}</pre>
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}
              
              {/* Analytics Section */}
              {results && results.data.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <OpportunityAnalytics 
                    opportunity={results.opportunity}
                    results={results}
                    isLoading={isSearching}
                  />
                </Box>
              )}
              
              {/* Additional Insights Section */}
              {results.data.length > 0 && (
                <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Opportunity Insights
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom>
                        Average Lot Size
                      </Typography>
                      <Typography variant="h5">
                        {formatNumber(
                          results.data.reduce((sum, p) => sum + (p.lotarea || 0), 0) / results.data.length
                        )} sq ft
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom>
                        Average Assessment
                      </Typography>
                      <Typography variant="h5">
                        {formatCurrency(
                          results.data.reduce((sum, p) => sum + (p.assesstot || 0), 0) / results.data.length
                        )}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom>
                        Average Development Potential
                      </Typography>
                      <Typography variant="h5">
                        {formatNumber(
                          results.data.reduce((sum, p) => sum + (p.development_potential || 0), 0) / results.data.length
                        )} sq ft
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default OpportunityFinder;