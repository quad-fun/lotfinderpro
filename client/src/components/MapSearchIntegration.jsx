// client/src/components/MapSearchIntegration.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  Typography,
  Chip,
  Autocomplete
} from '@mui/material';
import { FaSearch, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';
import { searchPropertiesByAddress } from '../services/supabaseService';

function MapSearchIntegration({ onLocationSelect, onPropertySearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // NYC neighborhoods for autocomplete
  const nycNeighborhoods = [
    'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
    'Lower East Side', 'Upper East Side', 'Upper West Side', 'Midtown',
    'SoHo', 'TriBeCa', 'Greenwich Village', 'Chelsea', 'Hell\'s Kitchen',
    'Williamsburg', 'Park Slope', 'DUMBO', 'Red Hook', 'Bushwick',
    'Long Island City', 'Astoria', 'Flushing', 'Jamaica', 'Forest Hills',
    'Mott Haven', 'Fordham', 'Riverdale', 'Hunts Point',
    'St. George', 'Stapleton', 'Port Richmond'
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Try searching for properties by address
      const properties = await searchPropertiesByAddress(searchQuery, 20);
      
      if (properties.length > 0) {
        onPropertySearch(properties, searchQuery);
      } else {
        // Try geocoding the address/location
        await geocodeLocation(searchQuery);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const geocodeLocation = async (query) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}&bbox=-74.259,40.477,-73.700,40.917&limit=5`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        
        onLocationSelect({
          coordinates: [lng, lat],
          name: feature.place_name,
          zoom: 14
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onLocationSelect({
            coordinates: [longitude, latitude],
            name: 'Current Location',
            zoom: 15
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Map Search
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Autocomplete
          freeSolo
          options={nycNeighborhoods}
          value={searchQuery}
          onInputChange={(event, newValue) => setSearchQuery(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search by address, neighborhood, or BBL..."
              variant="outlined"
              size="small"
              onKeyPress={handleKeyPress}
            />
          )}
          sx={{ flexGrow: 1 }}
        />
        
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          startIcon={<FaSearch />}
        >
          Search
        </Button>
        
        <IconButton
          onClick={getCurrentLocation}
          color="primary"
          title="Use current location"
        >
          <FaCrosshairs />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Quick search:
        </Typography>
        {['Manhattan', 'Brooklyn', 'Queens', 'Vacant lots', 'Development opportunities'].map((term) => (
          <Chip
            key={term}
            label={term}
            size="small"
            clickable
            onClick={() => {
              setSearchQuery(term);
              setTimeout(() => handleSearch(), 100);
            }}
          />
        ))}
      </Box>
    </Paper>
  );
}

export default MapSearchIntegration;