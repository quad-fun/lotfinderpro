// client/src/pages/SavedSearches.jsx
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  FaSearch,
  FaTrash,
  FaEdit,
  FaStar,
  FaBuilding,
  FaCalendarAlt,
  FaSave
} from 'react-icons/fa';

// Import services
import { getSavedSearches, getFavoriteProperties } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';

// Format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

function SavedSearches() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  
  // Fetch saved searches
  const {
    data: savedSearches,
    isLoading: searchesLoading,
    error: searchesError
  } = useQuery(
    ['savedSearches', user?.id],
    () => getSavedSearches(user.id),
    { enabled: !!user?.id }
  );
  
  // Fetch favorite properties
  const {
    data: favorites,
    isLoading: favoritesLoading,
    error: favoritesError
  } = useQuery(
    ['favoriteProperties', user?.id],
    () => getFavoriteProperties(user.id),
    { enabled: !!user?.id }
  );
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  if (!user) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Please log in to view your saved searches and favorites.
      </Alert>
    );
  }
  
  const isLoading = searchesLoading || favoritesLoading;
  const hasError = searchesError || favoritesError;
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (hasError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading your saved data. Please try again later.
      </Alert>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Saved Items
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Saved Searches" icon={<FaSearch />} iconPosition="start" />
          <Tab label="Favorite Properties" icon={<FaStar />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Saved Searches Tab */}
      {tabValue === 0 && (
        <>
          {(!savedSearches || savedSearches.length === 0) ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                You don't have any saved searches yet.
              </Typography>
              <Button
                component={Link}
                to="/search"
                variant="contained"
                startIcon={<FaSearch />}
                sx={{ mt: 2 }}
              >
                Start Searching
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date Saved</TableCell>
                    <TableCell width="30%">Query</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {savedSearches.map((search) => (
                    <TableRow key={search.id}>
                      <TableCell>{search.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={search.query_type}
                          color={search.query_type === 'template' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(search.created_at)}</TableCell>
                      <TableCell>
                        {search.query_type === 'nlp' ? (
                          <Typography variant="body2">{search.nlp_query}</Typography>
                        ) : (
                          <Typography variant="body2">Template Search: {search.template_id}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <IconButton
                            component={Link}
                            to={`/search?saved=${search.id}`}
                            color="primary"
                            size="small"
                          >
                            <FaSearch />
                          </IconButton>
                          <IconButton color="default" size="small">
                            <FaEdit />
                          </IconButton>
                          <IconButton color="error" size="small">
                            <FaTrash />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
      
      {/* Favorite Properties Tab */}
      {tabValue === 1 && (
        <>
          {(!favorites || favorites.length === 0) ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                You don't have any favorite properties yet.
              </Typography>
              <Button
                component={Link}
                to="/search"
                variant="contained"
                startIcon={<FaSearch />}
                sx={{ mt: 2 }}
              >
                Find Properties
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {favorites.map((favorite) => (
                <Grid item xs={12} sm={6} md={4} key={favorite.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom>
                        {favorite.property.address || `Property ${favorite.property.bbl}`}
                      </Typography>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FaBuilding size={16} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          {favorite.property.borough}, {favorite.property.zonedist1 || 'No Zone'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FaSave size={16} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          Saved on {formatDate(favorite.created_at)}
                        </Typography>
                      </Box>
                      
                      {favorite.notes && (
                        <Typography variant="body2" sx={{ mt: 2 }}>
                          Notes: {favorite.notes}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        component={Link}
                        to={`/property/${favorite.property.id}`}
                        size="small"
                      >
                        View Details
                      </Button>
                      <Button
                        size="small"
                        color="error"
                      >
                        Remove
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}

export default SavedSearches;