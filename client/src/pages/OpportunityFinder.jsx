// client/src/pages/OpportunityFinder.jsx
import React, { useState } from 'react';
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
  Tab
} from '@mui/material';
import { 
  FaSearch, 
  FaMapMarkerAlt, 
  FaTable, 
  FaInfoCircle
} from 'react-icons/fa';

// Import components and services
import PropertyTable from '../components/PropertyTable';
import PropertyMap from '../components/PropertyMap';
import { getOpportunityTypes, findOpportunities } from '../services/supabaseService';

function OpportunityFinder() {
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('table');
  const [selectedType, setSelectedType] = useState('');
  const [borough, setBorough] = useState('');
  const [results, setResults] = useState(null);
  
  // Get type ID from URL params if present
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get('type');
  
  // Fetch opportunity types
  const { data: opportunityTypes, isLoading } = useQuery(
    'opportunityTypes',
    getOpportunityTypes
  );
  
  // Set selected type from URL parameter
  React.useEffect(() => {
    if (typeParam && opportunityTypes) {
      setSelectedType(typeParam);
    }
  }, [typeParam, opportunityTypes]);
  
  // Handle search
  const handleSearch = async () => {
    if (!selectedType) return;
    
    try {
      const data = await findOpportunities(selectedType, borough || undefined);
      setResults(data);
    } catch (error) {
      console.error('Error finding opportunities:', error);
    }
  };
  
  // Render images for opportunity cards (in a real app, these would be actual images)
  const getOpportunityImage = (name) => {
    const imageMap = {
      'Vacant Residential Lots': 'https://source.unsplash.com/random?vacant,lot',
      'Underbuilt Commercial Properties': 'https://source.unsplash.com/random?commercial,building',
      'High Land Value Ratio Properties': 'https://source.unsplash.com/random?property,value',
      'Development Rights Transfer Candidates': 'https://source.unsplash.com/random?skyscraper,development'
    };
    
    return imageMap[name] || 'https://source.unsplash.com/random?realestate';
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
            >
              <MenuItem value="">All Boroughs</MenuItem>
              <MenuItem value="Manhattan">Manhattan</MenuItem>
              <MenuItem value="Brooklyn">Brooklyn</MenuItem>
              <MenuItem value="Bronx">Bronx</MenuItem>
              <MenuItem value="Queens">Queens</MenuItem>
              <MenuItem value="Staten Island">Staten Island</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<FaSearch />}
              onClick={handleSearch}
              disabled={!selectedType}
            >
              Find Opportunities
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
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
                
                <Typography variant="subtitle2" color="text.secondary">
                  Search Criteria: {results.opportunity.criteria}
                </Typography>
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
                  No properties found matching these criteria. Try adjusting your search parameters.
                </Alert>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default OpportunityFinder;