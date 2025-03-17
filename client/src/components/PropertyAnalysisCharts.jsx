// client/src/components/PropertyAnalysisCharts.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

function PropertyAnalysisCharts({ property }) {
  const [chartType, setChartType] = useState(0);
  const [barMetric, setBarMetric] = useState('area');

  if (!property) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1">
          No property data available for visualization.
        </Typography>
      </Paper>
    );
  }

  // Prepare FAR data for chart
  const farData = [
    { name: 'Built FAR', value: property.builtfar || 0 },
    { name: 'Available FAR', value: property.residfar ? Math.max(0, property.residfar - (property.builtfar || 0)) : 0 }
  ];

  // Prepare area breakdown data
  const areaData = [
    { name: 'Residential', value: property.resarea || 0 },
    { name: 'Commercial', value: property.comarea || 0 },
    { name: 'Office', value: property.officearea || 0 },
    { name: 'Retail', value: property.retailarea || 0 },
    { name: 'Storage', value: property.strgearea || 0 },
    { name: 'Factory', value: property.factryarea || 0 },
    { name: 'Garage', value: property.garagearea || 0 }
  ].filter(item => item.value > 0);

  // Prepare assessment data
  const assessmentData = [
    { name: 'Land Value', value: property.assessland || 0 },
    { name: 'Improvement Value', value: property.assessland && property.assesstot ? property.assesstot - property.assessland : 0 }
  ];

  // Prepare area metrics for bar chart
  const areaMetrics = [
    { 
      name: 'Current vs Potential',
      current: property.bldgarea || 0,
      potential: property.lotarea * (property.residfar || 0)
    }
  ];

  // Prepare value metrics for bar chart
  const valueMetrics = [
    {
      name: 'Property Value',
      landValue: property.assessland || 0,
      totalValue: property.assesstot || 0
    }
  ];

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  const handleChartTypeChange = (event, newValue) => {
    setChartType(newValue);
  };

  const handleBarMetricChange = (event) => {
    setBarMetric(event.target.value);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Property Analysis Charts
      </Typography>

      <Tabs
        value={chartType}
        onChange={handleChartTypeChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="Area Distribution" />
        <Tab label="FAR Analysis" />
        <Tab label="Value Breakdown" />
        <Tab label="Comparison" />
      </Tabs>

      {/* Chart 1: Area Distribution (Pie Chart) */}
      {chartType === 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Building Area Distribution
          </Typography>
          <Box sx={{ height: 400 }}>
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {areaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value) + ' sq ft'} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body1" textAlign="center" sx={{ pt: 10 }}>
                No area distribution data available for this property.
              </Typography>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Total Building Area: {formatNumber(property.bldgarea || 0)} sq ft
          </Typography>
        </Box>
      )}

      {/* Chart 2: FAR Analysis (Pie Chart) */}
      {chartType === 1 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            FAR Usage Analysis
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={farData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#0088FE" />
                  <Cell fill="#00C49F" />
                </Pie>
                <Tooltip formatter={(value) => value.toFixed(2)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <Typography variant="body2" textAlign="center">
                Built FAR: {property.builtfar?.toFixed(2) || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" textAlign="center">
                Maximum Residential FAR: {property.residfar?.toFixed(2) || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Chart 3: Value Breakdown (Pie Chart) */}
      {chartType === 2 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Property Value Breakdown
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assessmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#00C49F" />
                  <Cell fill="#FF8042" />
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Land-to-Value Ratio: {property.value_ratio?.toFixed(2) || 'N/A'}
          </Typography>
        </Box>
      )}

      {/* Chart 4: Comparison (Bar Chart) */}
      {chartType === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Property Metrics Comparison
            </Typography>
            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel id="bar-metric-label">Metric</InputLabel>
              <Select
                labelId="bar-metric-label"
                id="bar-metric-select"
                value={barMetric}
                label="Metric"
                onChange={handleBarMetricChange}
              >
                <MenuItem value="area">Area Metrics</MenuItem>
                <MenuItem value="value">Value Metrics</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              {barMetric === 'area' ? (
                <BarChart data={areaMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip formatter={(value) => formatNumber(value) + ' sq ft'} />
                  <Legend />
                  <Bar name="Current Building Area" dataKey="current" fill="#8884d8" />
                  <Bar name="Maximum Potential Area" dataKey="potential" fill="#82ca9d" />
                </BarChart>
              ) : (
                <BarChart data={valueMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => value >= 1000000 ? `$${(value/1000000).toFixed(1)}M` : `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar name="Land Value" dataKey="landValue" fill="#00C49F" />
                  <Bar name="Total Value" dataKey="totalValue" fill="#FF8042" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Box>
          
          {barMetric === 'area' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Development Potential: {formatNumber(property.development_potential || 0)} sq ft
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maximum Potential Value: {
                  formatCurrency(
                    property.development_potential * 
                    (property.assessland && property.lotarea ? property.assessland / property.lotarea : 0)
                  )
                }
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default PropertyAnalysisCharts;