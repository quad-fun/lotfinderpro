// client/src/pages/PropertyDetail.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Divider, 
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import { 
  FaArrowLeft, 
  FaStar, 
  FaRegStar, 
  FaBuilding, 
  FaRuler,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaPercentage
} from 'react-icons/fa';

// Import services
import { getPropertyById, saveFavoriteProperty } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import PropertyMap from '../components/PropertyMap';
import PropertyAnalysisCharts from '../components/PropertyAnalysisCharts';
import PropertyComparison from '../components/PropertyComparison';

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

function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Fetch property details
  const { data: property, isLoading, error } = useQuery(
    ['property', id], 
    () => getPropertyById(id),
    { enabled: !!id }
  );
  
  // Toggle favorite status
  const handleToggleFavorite = async () => {
    if (!user) return;
    
    try {
      // Optimistic UI update
      setFavorite(!favorite);
      
      // Save to database
      await saveFavoriteProperty(user.id, id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update on error
      setFavorite(!favorite);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading property details: {error.message}
      </Alert>
    );
  }
  
  if (!property) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Property not found.
      </Alert>
    );
  }
  
  return (
    <Box>
      {/* Header with Back Button */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          component={Link} 
          to="/search" 
          startIcon={<FaArrowLeft />}
          variant="outlined"
        >
          Back to Search
        </Button>
        
        {user && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={favorite ? <FaStar /> : <FaRegStar />}
            onClick={handleToggleFavorite}
          >
            {favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </Button>
        )}
      </Box>
      
      {/* Property Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {property.address || `Property ${property.bbl}`}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            label={property.borough} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={property.zonedist1 || 'No Zone'} 
            color="secondary" 
            variant="outlined" 
          />
          <Chip 
            label={property.built_status === 'vacant' ? 'Vacant' : 'Built'} 
            color={property.built_status === 'vacant' ? 'success' : 'default'} 
            variant="outlined" 
          />
        </Box>
        
        <Typography variant="subtitle1" color="text.secondary">
          BBL: {property.bbl} | Block: {property.block} | Lot: {property.lot}
        </Typography>
      </Paper>
      
      {/* Tabs for different sections */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Property Map" />
          <Tab label="Development Analysis" />
        </Tabs>
      </Box>
      
      {/* Tab Panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Main Property Info */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Property Information
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row" width="40%">Address</TableCell>
                      <TableCell>{property.address || 'No Address'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Borough, Block, Lot</TableCell>
                      <TableCell>{property.borough}, {property.block}, {property.lot}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Zip Code</TableCell>
                      <TableCell>{property.zipcode || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Zoning</TableCell>
                      <TableCell>{property.zonedist1 || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Building Class</TableCell>
                      <TableCell>{property.bldgclass || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Land Use</TableCell>
                      <TableCell>{property.landuse || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Owner Type</TableCell>
                      <TableCell>{property.ownertype || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Year Built</TableCell>
                      <TableCell>{property.yearbuilt || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Last Alteration</TableCell>
                      <TableCell>{property.yearalter1 || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Landmark Status</TableCell>
                      <TableCell>{property.landmark || 'Not a Landmark'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
          
          {/* Metrics Cards */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FaMoneyBillWave color="#1976d2" size={20} style={{ marginRight: 8 }} />
                      <Typography variant="h6" component="div">
                        Assessment
                      </Typography>
                    </Box>
                    <Typography variant="h4" color="text.primary">
                      {formatCurrency(property.assesstot)}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Land Value: {formatCurrency(property.assessland)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FaRuler color="#9c27b0" size={20} style={{ marginRight: 8 }} />
                      <Typography variant="h6" component="div">
                        Size
                      </Typography>
                    </Box>
                    <Typography variant="h4" color="text.primary">
                      {formatNumber(property.lotarea)} sq ft
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Building Area: {formatNumber(property.bldgarea)} sq ft
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FaBuilding color="#f44336" size={20} style={{ marginRight: 8 }} />
                      <Typography variant="h6" component="div">
                        Building
                      </Typography>
                    </Box>
                    <Typography variant="h5" color="text.primary">
                      {property.numfloors || 0} Floors
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Units: {property.unitstotal || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Residential Units: {property.unitsres || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <FaPercentage color="#4caf50" size={20} style={{ marginRight: 8 }} />
                      <Typography variant="h6" component="div">
                        FAR Analysis
                      </Typography>
                    </Box>
                    <Typography variant="h5" color="text.primary">
                      Built: {property.builtfar?.toFixed(2) || 'N/A'}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Max Residential FAR: {property.residfar?.toFixed(2) || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Max Commercial FAR: {property.commfar?.toFixed(2) || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Development Potential */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Development Metrics
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h5" gutterBottom>
                      Development Potential
                    </Typography>
                    <Typography variant="h3" color={property.development_potential > 0 ? 'success.main' : 'text.primary'}>
                      {formatNumber(property.development_potential)} sq ft
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h5" gutterBottom>
                      Value Ratio
                    </Typography>
                    <Typography variant="h3" color={property.value_ratio > 0.7 ? 'warning.main' : 'text.primary'}>
                      {property.value_ratio?.toFixed(2) || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h5" gutterBottom>
                      Zoning Efficiency
                    </Typography>
                    <Typography variant="h3" color={property.zoning_efficiency < 0.5 ? 'success.main' : 'text.primary'}>
                      {property.zoning_efficiency?.toFixed(2) || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {tabValue === 1 && (
        <Box sx={{ height: '600px' }}>
          <PropertyMap properties={[property]} />
        </Box>
      )}
      
      {tabValue === 2 && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Development Analysis
            </Typography>
            
            <Typography variant="body1" paragraph>
              Based on current zoning and built FAR, this property has the following development potential:
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row">Maximum Buildable Area</TableCell>
                        <TableCell>
                          {formatNumber(property.lotarea * property.residfar)} sq ft
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Current Built Area</TableCell>
                        <TableCell>{formatNumber(property.bldgarea)} sq ft</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Unused Development Rights</TableCell>
                        <TableCell>{formatNumber(property.development_potential)} sq ft</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Land Value per Buildable Sq Ft</TableCell>
                        <TableCell>
                          {formatCurrency(property.assessland / (property.lotarea * property.residfar))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Opportunity Analysis
                </Typography>
                
                {property.built_status === 'vacant' && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    This is a vacant lot with significant development potential.
                  </Alert>
                )}
                
                {property.value_ratio > 0.7 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This property has a high land-to-total value ratio, indicating potential for redevelopment.
                  </Alert>
                )}
                
                {property.zoning_efficiency < 0.5 && property.builtfar > 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This property is significantly underbuilt relative to what zoning allows.
                  </Alert>
                )}
                
                {property.yearbuilt < 1950 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This is an older building (built in {property.yearbuilt}), which may have higher maintenance costs.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          {/* Property Analysis Charts */}
          <PropertyAnalysisCharts property={property} />
          
          {/* Property Comparison Tool */}
          <Box sx={{ mt: 3 }}>
            <PropertyComparison initialProperties={[property]} />
          </Box>
        </>
      )}
    </Box>
  );
}

export default PropertyDetail;