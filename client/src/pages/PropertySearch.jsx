// client/src/pages/PropertySearch.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { Tab, Tabs, Box, Button, TextField, MenuItem, Typography, 
         CircularProgress, Paper, Grid, Divider, InputAdornment } from '@mui/material';
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
  executeNlpQuery,
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
  const { register, handleSubmit, setValue } = useForm();
  const [nlpQuery, setNlpQuery] = useState('');
  
  // Search loading state
  const [isSearching, setIsSearching] = useState(false);
  
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
        executeNlpQuery(queryParam);
      }, 500);
    }
  }, [location.search, setValue]);

  // Query for filter options (boroughs, zoning districts) - using real data
  const { data: filterOptions, isLoading: filterOptionsLoading } = useQuery(
    'filterOptions',
    getFilterOptions
  );
  
  // Fetch query templates
  const { data: queryTemplates, isLoading: templatesLoading } = useQuery(
    'queryTemplates',
    getQueryTemplates
  );
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchResults(null); // Clear previous search results
  };
  
  // Handle form submission for NLP search
  const handleNlpSearch = async (data) => {
    try {
      setIsSearching(true);
      const query = data.nlpQuery.trim();
      setNlpQuery(query);
      
      await executeNlpQuery(query);
    } catch (error) {
      console.error('NLP search error:', error);
      // Show error notification
    } finally {
      setIsSearching(false);
    }
  };
  
  // Execute NLP query function (separated for reuse)
  const executeNlpQuery = async (query) => {
    try {
      setIsSearching(true);
      
      const result = await executeNlpQuery(
        query,
        user?.id // Pass user ID for saving if logged in
      );
      
      setSearchResults({
        data: result.results,
        count: result.count,
        searchType: 'nlp',
        explanation: result.explanation,
        sql: result.sql,
        query
      });
    } catch (error) {
      console.error('NLP search error:', error);
      // Show error notification
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
    } catch (error) {
      console.error('Search error:', error);
      // Show error notification - would use toast context in a complete app
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
    } catch (error) {
      console.error('Template search error:', error);
      // Show error notification
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle saving search
  const handleSaveSearch = () => {
    // This would open a modal to save the search in a complete app
    console.log('Save search:', searchResults);
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
      <Paper elevation={3} className="p-4 mb-6" sx={{ p: 3, mb: 4 }}>
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
            </Box>
            
            <TextField
              label="Natural Language Query"
              fullWidth
              multiline
              rows={3}
              {...register('nlpQuery', { required: true })}
              sx={{ mb: 3 }}
              placeholder="Describe the properties you're looking for..."
              defaultValue={nlpQuery}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ mt: 1.5, ml: 0.5 }}>
                    <FaMagic color="#4a148c" />
                  </InputAdornment>
                )
              }}
            />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Example queries:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <li>Find vacant R3-2 lots over 5,000 square feet in Staten Island</li>
                <li>Show me commercial properties built before 1950 with low improvement values</li>
                <li>Which neighborhoods have the highest concentration of underbuilt residential lots?</li>
                <li>Properties in Manhattan with an FAR below 5 and lot area over 2500 sqft</li>
              </Box>
            </Box>
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              startIcon={<FaMagic />}
              disabled={isSearching}
              size="large"
            >
              {isSearching ? "Generating Results..." : "Find Properties with AI"}
            </Button>
          </form>
        )}
        
        {/* Basic Filter Search Tab */}
        {tabValue === 1 && (
          <form onSubmit={handleSubmit(handleBasicSearch)}>
            <Typography variant="h6" gutterBottom>
              Filter Properties
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
                    <MenuItem key={borough} value={borough}>
                      {borough}
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
                  startIcon={<FaSearch />}
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
              Search Results ({searchResults.count} properties)
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
                disabled={isSearching} 
              />
              
              {/* Save search button (if user is logged in) */}
              {user && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FaSave />}
                  onClick={handleSaveSearch}
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
              <Typography variant="subtitle2">Generated SQL:</Typography>
              <pre style={{ overflowX: 'auto' }}>
                {searchResults.sql}
              </pre>
            </Paper>
          )}
          
          {/* Results display based on view mode */}
          {viewMode === 'table' ? (
            <PropertyTable 
              properties={searchResults.data}
              page={searchResults.page || 0}
              pageSize={searchResults.pageSize || 10}
              totalCount={searchResults.count}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          ) : (
            <PropertyMap properties={searchResults.data} />
          )}
        </Box>
      )}
    </div>
  );
}

export default PropertySearch;