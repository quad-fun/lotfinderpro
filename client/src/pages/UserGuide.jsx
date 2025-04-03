// client/src/pages/UserGuide.jsx
import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

function UserGuide() {
  return (
    <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        LotFinder Pro: User Guide
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Introduction
        </Typography>
        <Typography paragraph>
          LotFinder Pro helps you discover real estate development opportunities in NYC using property data analysis. 
          This guide explains key features and search strategies.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" gutterBottom>
          Smart Search
        </Typography>
        <Typography paragraph>
          The Natural Language search allows you to describe what you're looking for in plain English:
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Good examples:
        </Typography>
        <ul>
          <li>
            <Typography paragraph>
              "Find vacant lots in Brooklyn over 5,000 square feet"
            </Typography>
          </li>
          <li>
            <Typography paragraph>
              "Show me underutilized properties in Queens with high land value"
            </Typography>
          </li>
          <li>
            <Typography paragraph>
              "Find development opportunities in Staten Island with R3-2 zoning"
            </Typography>
          </li>
        </ul>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" gutterBottom>
          Key Metrics Explained
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Development Potential
        </Typography>
        <Typography paragraph>
          Development potential is calculated as: <code>(residfar - builtfar) * lotarea</code>
        </Typography>
        <Typography paragraph>
          This represents the additional buildable square footage available on a property:
        </Typography>
        <ul>
          <li>
            <Typography>
              Higher values indicate greater untapped development potential
            </Typography>
          </li>
          <li>
            <Typography>
              Properties with zero or negative values are already built to or beyond their maximum FAR
            </Typography>
          </li>
        </ul>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Value Ratio
        </Typography>
        <Typography paragraph>
          Value ratio is calculated as: <code>assessland / assesstot</code>
        </Typography>
        <Typography paragraph>
          This represents the portion of a property's value that comes from land versus improvements:
        </Typography>
        <ul>
          <li>
            <Typography>
              Higher ratios (&gt;0.7) often indicate underutilized properties
            </Typography>
          </li>
          <li>
            <Typography>
              Properties with high land value relative to building value may be good redevelopment candidates
            </Typography>
          </li>
        </ul>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Zoning Efficiency
        </Typography>
        <Typography paragraph>
          Zoning efficiency is calculated as: <code>builtfar / residfar</code>
        </Typography>
        <Typography paragraph>
          This shows how much of the allowed FAR has been used:
        </Typography>
        <ul>
          <li>
            <Typography>
              Lower values (&lt;0.5) indicate significantly underbuilt properties
            </Typography>
          </li>
          <li>
            <Typography>
              Values close to 1.0 indicate properties built to near maximum allowed density
            </Typography>
          </li>
        </ul>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" gutterBottom>
          Search Strategies
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          For Developers
        </Typography>
        <ul>
          <li>
            <Typography>
              Look for high "development potential" on larger lots
            </Typography>
          </li>
          <li>
            <Typography>
              Filter for vacant lots or properties with high value ratio
            </Typography>
          </li>
          <li>
            <Typography>
              Focus on areas with favorable zoning and lower building-to-land value ratios
            </Typography>
          </li>
        </ul>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          For Investors
        </Typography>
        <ul>
          <li>
            <Typography>
              Identify properties with significant unused development rights
            </Typography>
          </li>
          <li>
            <Typography>
              Look for older buildings (pre-1950) with high land values
            </Typography>
          </li>
          <li>
            <Typography>
              Find properties where land value exceeds 70% of total assessment
            </Typography>
          </li>
        </ul>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          For Property Analysis
        </Typography>
        <Typography paragraph>
          The property detail page shows comprehensive metrics including:
        </Typography>
        <ul>
          <li>
            <Typography>
              Current vs. maximum allowable FAR
            </Typography>
          </li>
          <li>
            <Typography>
              Development potential visualization
            </Typography>
          </li>
          <li>
            <Typography>
              Value metrics and zoning analysis
            </Typography>
          </li>
        </ul>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" gutterBottom>
          Saved Searches
        </Typography>
        <Typography paragraph>
          Save your most effective searches for regular monitoring of the NYC real estate market. This feature requires a user account.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" gutterBottom>
          Tips for Best Results
        </Typography>
        <ul>
          <li>
            <Typography>
              Be specific about location (borough, neighborhood)
            </Typography>
          </li>
          <li>
            <Typography>
              Include size parameters when relevant
            </Typography>
          </li>
          <li>
            <Typography>
              Specify property types (residential, commercial, mixed-use)
            </Typography>
          </li>
          <li>
            <Typography>
              Use zoning districts when you have specific requirements
            </Typography>
          </li>
        </ul>
      </Paper>
    </Box>
  );
}

export default UserGuide;