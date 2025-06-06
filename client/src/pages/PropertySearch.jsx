// client/src/pages/PropertySearch.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { 
  Tab, 
  Tabs, 
  Box, 
  Button, 
  TextField, 
  MenuItem, 
  Typography, 
  CircularProgress, 
  Paper, 
  Grid, 
  Divider, 
  InputAdornment,
  Alert,
  Snackbar
} from '@mui/material';
import { FaMagic, FaSearch, FaFilter, FaSave, FaMapMarkedAlt, FaTable } from 'react-icons/fa';

// Custom components
import PropertyTable from '../components/PropertyTable';
import PropertyMap from '../components/PropertyMap';
import QueryTemplateForm from '../components/QueryTemplateForm';
import ExportMenu from '../components/ExportMenu';

// Services
import { 
  getProperties, 
  getQueryTemplates, 
  executeTemplateQuery, 
  performNlpQuery as nlpQueryService,
  getFilterOptions
} from '../services/supabaseService';

// Hooks
import { useAuth } from '../contexts/AuthContext';

function PropertySearch() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // State for tab control and view toggling
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'
  
  // State for search results
  const [searchResults, setSearchResults] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Template query state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateParameters, setTemplateParameters] = useState({});
  
  // NLP query state
  const { register, handleSubmit, setValue, watch } = useForm();
  const [nlpQuery, setNlpQuery] = useState('');
  
  // Search loading state
  const [isSearching, setIsSearching] = useState(false);
  
  // Error and success messaging
  const [notification, setNotification] = useState({ open: false, message: '', type: 'info' });
  
  // Auth context for user info
  const { user } = useAuth();

  // Process URL parameters on component mount
  useEffect(() => {
    // Get tab parameter if present
    const tabParam = searchParams.get('tab');
    if (tabParam !== null) {
      setTabValue(parseInt(tabParam, 10));
    }
    
    // Check for nlp parameter and query
    const isNlpSearch = searchParams.get('nlp') === '1';
    const queryParam = searchParams.get('query');
    
    if (isNlpSearch && queryParam) {
      // Set the tab to NLP search (0)
      setTabValue(0);
      // Set the query value
      setValue('nlpQuery', queryParam);
      setNlpQuery(queryParam);
      
      // Automatically execute the search
      setTimeout(() => {
        performNlpQuery(queryParam);
      }, 500);
    }
  }, [location.search, setValue]);

  // Query for filter options (boroughs, zoning districts) - using real data
  const { data: filterOptions, isLoading: filterOptionsLoading } = useQuery(
    'filterOptions',
    getFilterOptions,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
  
  // Fetch query templates
  const { data: queryTemplates, isLoading: templatesLoading } = useQuery(
    'queryTemplates',
    getQueryTemplates,
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchResults(null); // Clear previous search results
    setNotification({ open: false, message: '', type: 'info' });
  };
  
  // Handle form submission for NLP search
  const handleNlpSearch = async (data) => {
    try {
      setIsSearching(true);
      const query = data.nlpQuery.trim();
      setNlpQuery(query);
      
      if (!query) {
        setNotification({ 
          open: true, 
          message: 'Please enter a search query', 
          type: 'warning' 
        });
        return;
      }
      
      await performNlpQuery(query);
    } catch (error) {
      console.error('NLP search error:', error);
      setNotification({ 
        open: true, 
        message: `Search failed: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Execute NLP query function (separated for reuse)
  const performNlpQuery = async (query) => {
    try {
      setIsSearching(true);
      console.log('Calling nlp-query with:', { query, hasUserId: !!user?.id });
      
      const result = await nlpQueryService(query, user?.id);
      console.log('NLP query response:', result);
      
      if (!result) {
        throw new Error('No response received from NLP query service');
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Ensure we have data array
      const data = result.data || [];
      console.log('Data received:', data.length, 'properties');
      
      // Set search results with proper structure
      const searchResultsData = {
        data: data,
        count: result.count || data.length,
        searchType: 'nlp',
        explanation: result.explanation,
        sql: result.sql,
        source: result.source,
        page: 0,
        pageSize: data.length || 50
      };
      
      console.log('Setting search results:', searchResultsData);
      setSearchResults(searchResultsData);
      
      // Show success notification
      setNotification({ 
        open: true, 
        message: `Found ${data.length} properties matching your search`, 
        type: 'success' 
      });
      
    } catch (error) {
      console.error('NLP search error:', error);
      
      // Set error state but still show empty results structure
      setSearchResults({
        data: [],
        count: 0,
        searchType: 'nlp',
        error: error.message,
        explanation: 'Search failed: ' + error.message,
        sql: null
      });
      
      throw error; // Re-throw to be caught by handleNlpSearch
      
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle form submission for basic search
  const handleBasicSearch = async (data) => {
    try {
      setIsSearching(true);
      const result = await getProperties({ 
        queryKey: [
          'properties', 
          { 
            page: currentPage, 
            pageSize, 
            ...data 
          }
        ] 
      });
      
      setSearchResults({
        data: result.data,
        count: result.count,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        searchType: 'basic',
        searchParams: data
      });
      
      setNotification({ 
        open: true, 
        message: `Found ${result.count} properties`, 
        type: 'success' 
      });
      
    } catch (error) {
      console.error('Search error:', error);
      setNotification({ 
        open: true, 
        message: `Search failed: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle template search
  const handleTemplateSearch = async (parameters) => {
    if (!selectedTemplate) return;
    
    try {
      setIsSearching(true);
      const result = await executeTemplateQuery({
        templateId: selectedTemplate.id,
        parameters
      });
      
      setSearchResults({
        data: result.data,
        count: result.data.length,
        searchType: 'template',
        template: result.template,
        parameters,
        sql: result.sql
      });
      
      // Store parameters for potential reuse
      setTemplateParameters(parameters);
      
      setNotification({ 
        open: true, 
        message: `Template search completed: ${result.data.length} results`, 
        type: 'success' 
      });
      
    } catch (error) {
      console.error('Template search error:', error);
      setNotification({ 
        open: true, 
        message: `Template search failed: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle saving search
  const handleSaveSearch = () => {
    // This would open a modal to save the search in a complete app
    console.log('Save search:', searchResults);
    setNotification({ 
      open: true, 
      message: 'Search saved successfully', 
      type: 'success' 
    });
  };

  // Handle page changes
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(0); // Reset to first page
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  return (
    <div className="container mx-auto p-4">
      <Typography variant="h4" component="h1" gutterBottom>
        Property Search
      </Typography>
      
      {/* Tab navigation for search types */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Natural Language" icon={<FaMagic />} iconPosition="start" />
          <Tab label="Filter Search" icon={<FaFilter />} iconPosition="start" />
          <Tab label="Template Search" icon={<FaSearch />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Search forms */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        {/* Natural Language Search Tab */}
        {tabValue === 0 && (
          <form onSubmit={handleSubmit(handleNlpSearch)}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Smart Property Search
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Describe what you're looking for in plain English. Our AI will understand your request and find matching properties.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Example queries:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[
                    'Find vacant R3-2 lots over 5,000 square feet in Staten Island',
                    'Show me commercial properties built before 1950 with low improvement values',
                    'Which neighborhoods have the highest concentration of underbuilt residential lots?',
                    'Properties in Manhattan with an FAR below 5 and lot area over 2500 sqft'
                  ].map((example, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setValue('nlpQuery', example);
                        setNlpQuery(example);
                      }}
                      sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                    >
                      {example}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  {...register('nlpQuery', { required: 'Please enter a search query' })}
                  label="Natural Language Query"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="e.g., Find vacant lots in Brooklyn over 5,000 square feet"
                  variant="outlined"
                  value={nlpQuery}
                  onChange={(e) => setNlpQuery(e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  size="large"
                  startIcon={isSearching ? <CircularProgress size={20} color="inherit" /> : <FaMagic />}
                  disabled={isSearching}
                  sx={{ minWidth: 200 }}
                >
                  {isSearching ? "Searching..." : "Find Properties with AI"}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
        
        {/* Filter Search Tab */}
        {tabValue === 1 && (
          <form onSubmit={handleSubmit(handleBasicSearch)}>
            <Typography variant="h6" gutterBottom>
              Advanced Filter Search
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Borough"
                  fullWidth
                  {...register('borough')}
                  disabled={filterOptionsLoading}
                >
                  <MenuItem value="">All Boroughs</MenuItem>
                  {filterOptions?.boroughs?.map((borough) => (
                    <MenuItem key={borough.code} value={borough.code}>
                      {borough.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Zoning District"
                  fullWidth
                  {...register('zonedist1')}
                  disabled={filterOptionsLoading}
                >
                  <MenuItem value="">All Zoning Districts</MenuItem>
                  {filterOptions?.zoningDistricts?.map((zone) => (
                    <MenuItem key={zone} value={zone}>
                      {zone}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Min Lot Size (sq ft)"
                  type="number"
                  fullWidth
                  {...register('min_lotarea', { valueAsNumber: true })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Max Assessment Value ($)"
                  type="number"
                  fullWidth
                  {...register('max_assesstot', { valueAsNumber: true })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Building Class"
                  fullWidth
                  {...register('bldgclass')}
                  placeholder="e.g., A1, V9"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Built Status"
                  fullWidth
                  {...register('built_status')}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="built">Built</MenuItem>
                  <MenuItem value="vacant">Vacant</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  startIcon={isSearching ? <CircularProgress size={20} color="inherit" /> : <FaSearch />}
                  disabled={isSearching}
                >
                  {isSearching ? "Searching..." : "Search Properties"}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
        
        {/* Template Search Tab */}
        {tabValue === 2 && (
          <div>
            <Typography variant="h6" gutterBottom>
              Select a Query Template
            </Typography>
            
            {templatesLoading ? (
              <CircularProgress />
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    select
                    label="Query Template"
                    fullWidth
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const template = queryTemplates.find(t => t.id.toString() === e.target.value);
                      setSelectedTemplate(template);
                      setTemplateParameters({});
                    }}
                  >
                    <MenuItem value="">Select a template</MenuItem>
                    {queryTemplates?.map((template) => (
                      <MenuItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                
                {selectedTemplate && (
                  <Box>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {selectedTemplate.description}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <QueryTemplateForm 
                      template={selectedTemplate} 
                      initialValues={templateParameters}
                      onSubmit={handleTemplateSearch}
                      isLoading={isSearching}
                    />
                  </Box>
                )}
              </>
            )}
          </div>
        )}
      </Paper>
      
      {/* Search Results */}
      {searchResults && (
        <Box>
          {/* Result header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              Search Results ({searchResults.count || searchResults.data?.length || 0} properties)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* View toggle buttons */}
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                startIcon={<FaTable />}
                onClick={() => setViewMode('table')}
              >
                Table View
              </Button>
              <Button
                variant={viewMode === 'map' ? 'contained' : 'outlined'}
                startIcon={<FaMapMarkedAlt />}
                onClick={() => setViewMode('map')}
              >
                Map View
              </Button>
              
              {/* Export button */}
              <ExportMenu 
                properties={searchResults.data} 
                disabled={isSearching || !searchResults.data?.length} 
              />
              
              {/* Save search button (if user is logged in) */}
              {user && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FaSave />}
                  onClick={handleSaveSearch}
                  disabled={!searchResults.data?.length}
                >
                  Save Search
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Display explanation for NLP queries */}
          {searchResults.searchType === 'nlp' && searchResults.explanation && (
            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                How I understood your request:
              </Typography>
              <Typography variant="body1">{searchResults.explanation}</Typography>
            </Paper>
          )}
          
          {/* Display SQL for debugging/educational purposes */}
          {searchResults.sql && (
            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                Generated SQL:
              </Typography>
              <pre style={{ 
                overflowX: 'auto', 
                fontSize: '0.85rem', 
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {searchResults.sql}
              </pre>
            </Paper>
          )}
          
          {/* Error display */}
          {searchResults.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {searchResults.error}
            </Alert>
          )}
          
          {/* Results display based on view mode */}
          {searchResults.data?.length > 0 ? (
            viewMode === 'table' ? (
              <PropertyTable 
                properties={searchResults.data}
                page={searchResults.page || 0}
                pageSize={searchResults.pageSize || 10}
                totalCount={searchResults.count || searchResults.data.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            ) : (
              <PropertyMap properties={searchResults.data} />
            )
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No properties found matching your search criteria.
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default PropertySearch;