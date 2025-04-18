// client/src/components/OpportunityAnalytics.jsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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

function OpportunityAnalytics({ opportunity, results, isLoading }) {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!results || !results.data || results.data.length === 0) {
    return null;
  }

  // Calculate metrics from results
  const totalCount = results.data.length;
  const totalLandArea = results.data.reduce((sum, p) => sum + (p.lotarea || 0), 0);
  const avgLotSize = totalLandArea / totalCount;
  const avgAssessment = results.data.reduce((sum, p) => sum + (p.assesstot || 0), 0) / totalCount;
  const avgDevPotential = results.data.reduce((sum, p) => sum + (p.development_potential || 0), 0) / totalCount;
  
  // Borough breakdown for pie chart
  const boroughCounts = results.data.reduce((acc, property) => {
    const borough = property.borough || 'Unknown';
    acc[borough] = (acc[borough] || 0) + 1;
    return acc;
  }, {});
  
  const boroughData = Object.entries(boroughCounts).map(([name, value]) => ({
    name,
    value
  }));
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  // Prepare bar chart data for lot sizes
  const lotSizeRanges = [
    { range: '0-2,500', min: 0, max: 2500, count: 0 },
    { range: '2,500-5,000', min: 2500, max: 5000, count: 0 },
    { range: '5,000-10,000', min: 5000, max: 10000, count: 0 },
    { range: '10,000-20,000', min: 10000, max: 20000, count: 0 },
    { range: '20,000+', min: 20000, max: Infinity, count: 0 }
  ];
  
  results.data.forEach(property => {
    const lotarea = property.lotarea || 0;
    for (const range of lotSizeRanges) {
      if (lotarea >= range.min && lotarea < range.max) {
        range.count++;
        break;
      }
    }
  });

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Opportunity Analytics
      </Typography>
      
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>
            Key Metrics
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Properties:
                </Typography>
                <Typography variant="h6">
                  {formatNumber(totalCount)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Land Area:
                </Typography>
                <Typography variant="h6">
                  {formatNumber(totalLandArea)} sq ft
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Average Lot Size:
                </Typography>
                <Typography variant="h6">
                  {formatNumber(avgLotSize)} sq ft
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Average Assessment:
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(avgAssessment)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Average Development Potential:
                </Typography>
                <Typography variant="h6">
                  {formatNumber(avgDevPotential)} sq ft
                </Typography>
              </Grid>
            </Grid>
          </Box>
          
          {/* Borough Distribution Pie Chart */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
            Borough Distribution
          </Typography>
          
          <Box sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={boroughData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {boroughData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
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

        {/* Lot Size Distribution */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>
            Lot Size Distribution
          </Typography>
          
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lotSizeRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend />
                <Bar name="Number of Properties" dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 4 }}>
            Insights
          </Typography>
          
          <Typography variant="body2" paragraph>
            {opportunity.name.toLowerCase().includes('vacant') && 
              `This opportunity type focuses on vacant lots. The average lot size is ${formatNumber(avgLotSize)} sq ft, making them suitable for new development projects.`}
            
            {opportunity.name.toLowerCase().includes('underbuilt') && 
              `These properties have significant untapped development potential, averaging ${formatNumber(avgDevPotential)} sq ft of additional buildable area per property.`}
            
            {opportunity.name.toLowerCase().includes('value') && 
              `These properties have a high land-to-total value ratio, indicating they may be good candidates for redevelopment or repositioning.`}
            
            {opportunity.name.toLowerCase().includes('development') && 
              `These properties are well-positioned for air rights transfers, with significant unused development rights that could potentially be sold or transferred.`}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default OpportunityAnalytics;