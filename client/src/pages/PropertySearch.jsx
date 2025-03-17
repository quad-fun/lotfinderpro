// client/src/pages/PropertySearch.jsx
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useForm } from 'react-hook-form';
import { Tab, Tabs, Box, Button, TextField, MenuItem, Typography, 
         CircularProgress, Paper, Grid, Divider } from '@mui/material';
import { FaSearch, FaMagic, FaFilter, FaSave } from 'react-icons/fa';

// Custom components
import PropertyTable from '../components/PropertyTable';
import PropertyMap from '../components/PropertyMap';
import QueryTemplateForm from '../components/QueryTemplateForm';

// Services
import { getProperties, getQueryTemplates, executeTemplateQuery, executeNlpQuery } from '../services/supabaseService';

// Hooks
import { useAuth } from '../contexts/AuthContext';

function PropertySearch() {
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
  const { register, handleSubmit } = useForm();
  const [nlpQuery, setNlpQuery] = useState('');
  
  // Auth context for user info
  const { user } = useAuth();

  // Query for filter options (boroughs, zoning districts)
  const { data: filterOptions } = useQuery('filterOptions', async () => {
    // In a real app, these would be fetched from the database
    return {
      boroughs: ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'],
      zoningDistricts: ['R1-1', 'R2', 'R3-1', 'R3-2', 'R4', 'R5', 'R6', 'R7', 'R8', 'C1-6', 'C1-7', 'C2-6', 'C2-7', 'C4-4', 'C4-5', 'C4-6', 'C4-7', 'C5-1', 'C5-2', 'C5-3', 'C6-1', 'C6-2', 'C6-3', 'C6-4', 'C6-5', 'C6-6', 'C6-7', 'M1-1', 'M1-2', 'M1-3', 'M1-4', 'M1-5', 'M1-6', 'M2-1', 'M2-2', 'M2-3', 'M2-4', 'M3-1', 'M3-2']
    };
  });
  
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
  
  // Handle form submission for basic search
  const handleBasicSearch = async (data) => {
    try {
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
    }
  };
  
  // Handle template search
  const handleTemplateSearch = async (parameters) => {
    if (!selectedTemplate) return;
    
    try {
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
    }
  };
  
  // Handle NLP search
  const handleNlpSearch = async (data) => {
    try {
      const query = data.nlpQuery.trim();
      setNlpQuery(query);
      
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
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <Typography variant="h4" component="h1" gutterBottom>
        Property Search
      </Typography>
      
      {/* Tab navigation for search types */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Basic Search" icon={<FaFilter />} iconPosition="start" />
          <Tab label="Template Search" icon={<FaSearch />} iconPosition="start" />
          <Tab label="Natural Language" icon={<FaMagic />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Search forms */}
      <Paper elevation={3} className="p-4 mb-6">
        {/* Basic Search Tab */}
        {tabValue === 0 && (
          <form onSubmit={handleSubmit(handleBasicSearch)}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Borough"
                  fullWidth
                  {...register('borough')}
                >
                  <MenuItem value="">All Boroughs</MenuItem>
                  {filterOptions?.boroughs.map((borough) => (
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
                >
                  <MenuItem value="">All Zoning Districts</MenuItem>
                  {filterOptions?.zoningDistricts.map((zone) => (
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
                >
                  Search Properties
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
        
        {/* Template Search Tab */}
        {tabValue === 1 && (
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
                    />
                  </Box>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Natural Language Search Tab */}
        {tabValue === 2 && (
          <form onSubmit={handleSubmit(handleNlpSearch)}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Describe what you're looking for in plain English. For example:
            </Typography>
            
            <Box sx={{ mb: 2, pl: 2 }}>
              <Typography variant="body2" component="ul">
                <li>"Find vacant R3-2 lots over 5,000 square feet in Staten Island"</li>
                <li>"Show me commercial properties built before 1950 with low improvement values"</li>
                <li>"Which neighborhoods have the highest concentration of underbuilt residential lots?"</li>
              </Typography>
            </Box>
            
            <TextField
              label="Natural Language Query"
              fullWidth
              multiline
              rows={3}
              {...register('nlpQuery', { required: true })}
              sx={{ mb: 2 }}
              placeholder="Describe the properties you're looking for..."
            />
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              startIcon={<FaMagic />}
            >
              Generate Results
            </Button>
          </form>
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
                onClick={() => setViewMode('table')}
              >
                Table View
              </Button>
              <Button
                variant={viewMode === 'map' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('map')}
              >
                Map View
              </Button>
              
              {/* Save search button (if user is logged in) */}
              {user && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FaSave />}
                  // This would open a modal to save the search in a complete app
                >
                  Save Search
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Display SQL for debugging/educational purposes */}
          {searchResults.sql && (
            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle2">Generated SQL:</Typography>
              <pre style={{ overflowX: 'auto' }}>
                {searchResults.sql}
              </pre>
              
              {searchResults.explanation && (
                <Box mt={2}>
                  <Typography variant="subtitle2">Query Explanation:</Typography>
                  <Typography variant="body2">{searchResults.explanation}</Typography>
                </Box>
              )}
            </Paper>
          )}
          
          {/* Results display based on view mode */}
          {viewMode === 'table' ? (
            <PropertyTable 
              properties={searchResults.data}
              page={searchResults.page}
              pageSize={searchResults.pageSize}
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