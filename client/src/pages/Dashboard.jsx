// client/src/pages/Dashboard.jsx
import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  FaSearch,
  FaStar,
  FaLightbulb,
  FaInfoCircle,
  FaChartBar
} from 'react-icons/fa';

// Import custom components and services
import { getOpportunityTypes } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';

// Simple stat card component
const StatCard = ({ title, value, icon, color }) => (
  <Paper elevation={2} sx={{ height: '100%' }}>
    <Box p={2} display="flex" flexDirection="column">
      <Box display="flex" alignItems="center" mb={1}>
        <Box color={color} mr={1}>
          {icon}
        </Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="p" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  </Paper>
);

function Dashboard() {
  const { user } = useAuth();
  
  // Fetch opportunity types for the quick actions
  const { data: opportunityTypes, isLoading } = useQuery(
    'opportunityTypes',
    getOpportunityTypes
  );
  
  // Hardcoded stats for demo
  // In a real app, these would be fetched from the API
  const stats = [
    {
      title: 'Total Properties',
      value: '857,432',
      icon: <FaInfoCircle size={20} />,
      color: 'primary.main'
    },
    {
      title: 'Development Opportunities',
      value: '42,189',
      icon: <FaLightbulb size={20} />,
      color: 'success.main'
    },
    {
      title: 'Vacant Lots',
      value: '18,742',
      icon: <FaInfoCircle size={20} />,
      color: 'warning.main'
    },
    {
      title: 'NYC Value Ratio Avg',
      value: '0.62',
      icon: <FaChartBar size={20} />,
      color: 'info.main'
    }
  ];
  
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to LotFinder Pro - your tool for discovering real estate opportunities in NYC.
        </Typography>
      </Box>
      
      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>
      
      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <FaSearch color="#1976d2" size={20} />
                  <Typography variant="h6" component="h3" ml={1}>
                    Property Search
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Search for properties using filters like borough, zoning, lot size, and more.
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={Link} to="/search" size="small">
                  Go to Search
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <FaLightbulb color="#ed6c02" size={20} />
                  <Typography variant="h6" component="h3" ml={1}>
                    Opportunity Finder
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Discover properties with development potential, value investment opportunities, and more.
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={Link} to="/opportunities" size="small">
                  Find Opportunities
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          {user && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <FaStar color="#9c27b0" size={20} />
                    <Typography variant="h6" component="h3" ml={1}>
                      Saved Searches
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Access and manage your saved property searches and favorite properties.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button component={Link} to="/saved" size="small">
                    View Saved Searches
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
      
      {/* Common Opportunities */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Common Opportunities
        </Typography>
        
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {opportunityTypes?.map((opportunity) => (
              <Grid item xs={12} sm={6} md={3} key={opportunity.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {opportunity.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {opportunity.description}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button 
                      component={Link} 
                      to={`/opportunities?type=${opportunity.id}`}
                      size="small"
                      startIcon={<FaSearch />}
                    >
                      Find
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

export default Dashboard;