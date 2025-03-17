// client/src/components/PropertyMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';

// You'll need to get a Mapbox API key and set it as an environment variable
// This would be REACT_APP_MAPBOX_TOKEN in your .env file
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

function PropertyMap({ properties }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    if (!properties || properties.length === 0) {
      setMapError('No properties to display on the map.');
      setLoading(false);
      return;
    }

    // Initialize map if it doesn't exist yet
    if (!map.current) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-74.0060, 40.7128], // New York City coordinates
          zoom: 10
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Handle map load
        map.current.on('load', () => {
          setLoading(false);
          addPropertiesToMap();
        });

        // Handle map errors
        map.current.on('error', (e) => {
          setMapError(`Map error: ${e.error.message}`);
          setLoading(false);
        });
      } catch (error) {
        setMapError(`Failed to initialize map: ${error.message}`);
        setLoading(false);
      }
    } else {
      // Map already exists, just add properties
      addPropertiesToMap();
      setLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        // Clean up any specific resources if needed
      }
    };
  }, [properties]);

  // Function to add properties to the map
  const addPropertiesToMap = () => {
    if (!map.current || !map.current.loaded()) return;

    // Remove existing layers and sources
    if (map.current.getSource('properties')) {
      map.current.removeLayer('property-fills');
      map.current.removeLayer('property-borders');
      map.current.removeSource('properties');
    }

    // Filter properties with valid geometry
    const validProperties = properties.filter(p => 
      p.centroid || (p.latitude && p.longitude)
    );

    if (validProperties.length === 0) {
      setMapError('No properties with valid location data.');
      return;
    }

    // Prepare GeoJSON data
    const geojson = {
      type: 'FeatureCollection',
      features: validProperties.map(property => {
        // Try to get coordinates from centroid or lat/lng fields
        let coordinates;
        
        if (property.centroid) {
          // Parse centroid from PostGIS POINT format
          // Example format: "SRID=4326;POINT(-73.98 40.73)"
          const match = property.centroid.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            coordinates = [parseFloat(match[1]), parseFloat(match[2])];
          }
        } else if (property.latitude && property.longitude) {
          coordinates = [property.longitude, property.latitude];
        }

        // Skip properties without valid coordinates
        if (!coordinates) return null;

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates
          },
          properties: {
            id: property.id,
            address: property.address || 'No Address',
            borough: property.borough,
            zone: property.zonedist1 || 'N/A',
            lotarea: property.lotarea,
            assesstot: property.assesstot,
            developmentPotential: property.development_potential
          }
        };
      }).filter(Boolean) // Remove null entries
    };

    // Add source and layers to map
    map.current.addSource('properties', {
      type: 'geojson',
      data: geojson
    });

    // Add circles for property points
    map.current.addLayer({
      id: 'property-circles',
      type: 'circle',
      source: 'properties',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 3,
          15, 7
        ],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'developmentPotential'],
          0, '#ccc',
          1000, '#ffffcc',
          10000, '#ffeda0',
          50000, '#fed976',
          100000, '#feb24c',
          500000, '#fd8d3c',
          1000000, '#fc4e2a',
          5000000, '#e31a1c'
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // Add interactive layer for property points
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '300px'
    });

    // Show popup on hover
    map.current.on('mouseenter', 'property-circles', (e) => {
      map.current.getCanvas().style.cursor = 'pointer';
      
      const coordinates = e.features[0].geometry.coordinates.slice();
      const {
        id, address, borough, zone, lotarea, assesstot
      } = e.features[0].properties;
      
      // Format numbers for display
      const formattedLotArea = new Intl.NumberFormat().format(lotarea);
      const formattedAssessment = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(assesstot);
      
      const html = `
        <strong>${address}</strong><br />
        <div>Borough: ${borough}</div>
        <div>Zone: ${zone}</div>
        <div>Lot Area: ${formattedLotArea} sq ft</div>
        <div>Assessment: ${formattedAssessment}</div>
        <a href="/property/${id}" target="_blank">View Details</a>
      `;
      
      popup
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(map.current);
    });
    
    map.current.on('mouseleave', 'property-circles', () => {
      map.current.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Fit map to show all properties
    if (geojson.features.length > 0) {
      // Calculate bounds of all points
      const bounds = new mapboxgl.LngLatBounds();
      geojson.features.forEach(feature => {
        bounds.extend(feature.geometry.coordinates);
      });
      
      // Fit map to those bounds
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  };

  return (
    <Paper elevation={3} sx={{ position: 'relative', height: '600px', width: '100%' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.7)'
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {mapError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            padding: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <Typography color="error" align="center">
            {mapError}
          </Typography>
        </Box>
      )}
      
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 2,
          backgroundColor: 'white',
          padding: 1,
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <Typography variant="caption">
          <strong>Development Potential:</strong>
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.5
          }}
        >
          <Box sx={{ height: 10, width: 10, backgroundColor: '#ffffcc', borderRadius: '50%' }} />
          <Typography variant="caption">Low</Typography>
          <Box sx={{ height: 10, width: 10, backgroundColor: '#feb24c', borderRadius: '50%' }} />
          <Typography variant="caption">Medium</Typography>
          <Box sx={{ height: 10, width: 10, backgroundColor: '#e31a1c', borderRadius: '50%' }} />
          <Typography variant="caption">High</Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default PropertyMap;