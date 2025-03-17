// client/src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  TextField,
  Chip,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  FaSearch,
  FaStar,
  FaLightbulb,
  FaInfoCircle,
  FaChartBar,
  FaMagic,
  FaArrowRight
} from 'react-icons/fa';

// Import custom components and services
import { getOpportunityTypes, getDashboardStats } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';

// Simple stat card component
const StatCard = ({ title, value, icon, color }) => {
  // Determine which icon to use based on the icon name string
  let IconComponent;
  
  switch(icon) {
    case 'FaInfoCircle':
      IconComponent = <FaInfoCircle size={20} />;
      break;
    case 'FaLightbulb':
      IconComponent = <FaLightbulb size={20} />;
      break;
    case 'FaChartBar':
      IconComponent = <FaChartBar size={20} />;
      break;
    default:
      IconComponent = <FaInfoCircle size={20} />;
  }
  
  return (
    <Paper elevation={2} sx={{ height: '100%' }}>
      <Box p={2} display="flex" flexDirection="column">
        <Box display="flex" alignItems="center" mb={1}>
          <Box color={color} mr={1}>
            {IconComponent}
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
};

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nlpQuery, setNlpQuery] = useState('');
  
  // Example queries for the NLP search
  const exampleQueries = [
    "Find vacant lots over 5,000 sqft in Brooklyn",
    "Show me commercial properties built before 1950",
    "Which properties have the highest development potential?",
    "Residential lots with low FAR in Manhattan"
  ];
  
  // Handle NLP search submission
  const handleNlpSearch = (e) => {
    e.preventDefault();
    if (nlpQuery.trim()) {
      navigate(`/search?nlp=1&query=${encodeURIComponent(nlpQuery.trim())}`);
    }
  };
  
  // Set example query - renamed from useExampleQuery to avoid hook rule violations
  const setExampleQuery = (query) => {
    setNlpQuery(query);
  };
  
  // Fetch opportunity types for the quick actions
  const { data: opportunityTypes, isLoading: opTypesLoading } = useQuery(
    'opportunityTypes',
    getOpportunityTypes
  );
  
  // Fetch dashboard stats from the API instead of using hardcoded data
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboardStats',
    getDashboardStats
  );
  
  // Default empty stats array for loading state
  const displayStats = stats || [];
  
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
      
      {/* NLP Smart Search Feature */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          border: '1px solid #4a148c', 
          borderLeft: '5px solid #4a148c',
          background: 'linear-gradient(to right, #f3e5f5, white)'
        }}
      >
        <Box mb={2} display="flex" alignItems="center">
          <FaMagic size={24} color="#4a148c" style={{ marginRight: 12 }} />
          <Typography variant="h5" component="h2" color="#4a148c">
            Smart Property Search
          </Typography>
        </Box>
        
        <Typography variant="body1" gutterBottom mb={2}>
          Search for properties using natural language - just describe what you're looking for in plain English!
        </Typography>
        
        <form onSubmit={handleNlpSearch}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="e.g., 'Find vacant lots in Brooklyn zoned for residential use'"
            value={nlpQuery}
            onChange={(e) => setNlpQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    type="submit" 
                    color="primary"
                    aria-label="search properties"
                  >
                    <FaArrowRight />
                  </IconButton>
                </InputAdornment>
              ),
              startAdornment: (
                <InputAdornment position="start">
                  <FaMagic color="#4a148c" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
        </form>
        
        <Typography variant="body2" color="text.secondary" mb={1}>
          Try one of these examples:
        </Typography>
        
        <Box display="flex" flexWrap="wrap" gap={1}>
          {exampleQueries.map((query, index) => (
            <Chip
              key={index}
              label={query}
              onClick={() => setExampleQuery(query)}
              variant="outlined"
              color="secondary"
              clickable
            />
          ))}
        </Box>
      </Paper>
      
      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsLoading ? (
          <Box width="100%" display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          displayStats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))
        )}
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
                    Advanced Search
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Search for properties using specific filters like borough, zoning, lot size, and more.
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={Link} to="/search?tab=1" size="small">
                  Go to Advanced Search
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
        
        {opTypesLoading ? (
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