// client/src/components/PropertyMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ButtonGroup,
  Button
} from '@mui/material';
import { Link } from 'react-router-dom';

// Set Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

function PropertyMap({ properties = [], height = '600px', showControls = true }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [showClusters, setShowClusters] = useState(true);
  const [colorBy, setColorBy] = useState('development_potential');
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11');

  // NYC Boroughs bounds for fallback
  const nycBounds = [
    [-74.259, 40.477], // Southwest coordinates
    [-73.700, 40.917]  // Northeast coordinates
  ];

  useEffect(() => {
    if (!process.env.REACT_APP_MAPBOX_TOKEN) {
      setMapError('Mapbox token not configured. Please add REACT_APP_MAPBOX_TOKEN to your environment variables.');
      setLoading(false);
      return;
    }

    if (!properties || properties.length === 0) {
      setMapError('No properties to display on the map.');
      setLoading(false);
      return;
    }

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [properties, showClusters, colorBy]);

  const initializeMap = () => {
    if (map.current) return; // Initialize map only once

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [-73.9857, 40.7484], // NYC center
        zoom: 10,
        maxBounds: nycBounds
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        setLoading(false);
        addPropertiesToMap();
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
        setLoading(false);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError(`Failed to initialize map: ${error.message}`);
      setLoading(false);
    }
  };

  const addPropertiesToMap = () => {
    if (!map.current || !map.current.loaded()) return;

    // Clear existing markers and sources
    clearMap();

    // Filter properties with valid coordinates
    const validProperties = properties.filter(p => {
      const coords = getPropertyCoordinates(p);
      return coords && coords[0] && coords[1];
    });

    if (validProperties.length === 0) {
      setMapError('No properties with valid location data.');
      return;
    }

    // Create GeoJSON data
    const geojson = createGeoJSON(validProperties);

    if (showClusters) {
      addClusteredLayer(geojson);
    } else {
      addIndividualMarkers(geojson);
    }

    // Fit map to properties
    fitMapToProperties(geojson);
  };

  const getPropertyCoordinates = (property) => {
    // Try multiple coordinate sources
    if (property.centroid) {
      // Parse PostGIS POINT format: "SRID=4326;POINT(-73.98 40.73)"
      const match = property.centroid.match(/POINT\(([^ ]+) ([^)]+)\)/);
      if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
      }
    }
    
    if (property.longitude && property.latitude) {
      return [parseFloat(property.longitude), parseFloat(property.latitude)];
    }

    // Fallback: estimate from BBL (very rough approximation)
    return estimateCoordinatesFromBBL(property);
  };

  const estimateCoordinatesFromBBL = (property) => {
    // Rough borough center coordinates
    const boroughCenters = {
      'MN': [-73.9712, 40.7831], // Manhattan
      'BX': [-73.8648, 40.8448], // Bronx
      'BK': [-73.9442, 40.6782], // Brooklyn
      'QN': [-73.7949, 40.7282], // Queens
      'SI': [-74.1502, 40.5795]  // Staten Island
    };

    const center = boroughCenters[property.borough];
    if (!center) return null;

    // Add small random offset to avoid overlapping
    const offset = 0.01;
    return [
      center[0] + (Math.random() - 0.5) * offset,
      center[1] + (Math.random() - 0.5) * offset
    ];
  };

  const createGeoJSON = (validProperties) => {
    return {
      type: 'FeatureCollection',
      features: validProperties.map(property => {
        const coordinates = getPropertyCoordinates(property);
        const value = getColorValue(property);
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates
          },
          properties: {
            id: property.id,
            bbl: property.bbl,
            address: property.address || 'No Address',
            borough: property.borough,
            zone: property.zonedist1 || 'N/A',
            lotarea: property.lotarea || 0,
            bldgarea: property.bldgarea || 0,
            assesstot: property.assesstot || 0,
            assessland: property.assessland || 0,
            developmentPotential: property.development_potential || 0,
            valueRatio: property.value_ratio || 0,
            builtfar: property.builtfar || 0,
            residfar: property.residfar || 0,
            colorValue: value
          }
        };
      })
    };
  };

  const getColorValue = (property) => {
    switch (colorBy) {
      case 'development_potential':
        return property.development_potential || 0;
      case 'value_ratio':
        return property.value_ratio || 0;
      case 'assesstot':
        return property.assesstot || 0;
      case 'lotarea':
        return property.lotarea || 0;
      default:
        return property.development_potential || 0;
    }
  };

  const addClusteredLayer = (geojson) => {
    // Add source
    map.current.addSource('properties', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Add cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'properties',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100, '#f1f075',
          750, '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100, 30,
          750, 40
        ]
      }
    });

    // Add cluster count labels
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'properties',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Add individual points
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'properties',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': getColorExpression(),
        'circle-radius': 8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    addMapInteractions();
  };

  const addIndividualMarkers = (geojson) => {
    // Add source without clustering
    map.current.addSource('properties', {
      type: 'geojson',
      data: geojson
    });

    // Add points
    map.current.addLayer({
      id: 'property-points',
      type: 'circle',
      source: 'properties',
      paint: {
        'circle-color': getColorExpression(),
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 4,
          15, 8
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    addMapInteractions();
  };

  const getColorExpression = () => {
    const property = colorBy === 'value_ratio' ? 'valueRatio' : 
                    colorBy === 'development_potential' ? 'developmentPotential' :
                    colorBy === 'assesstot' ? 'assesstot' : 'lotarea';

    return [
      'interpolate',
      ['linear'],
      ['get', property],
      0, '#ffffcc',
      1000, '#ffeda0',
      10000, '#fed976',
      50000, '#feb24c',
      100000, '#fd8d3c',
      500000, '#fc4e2a',
      1000000, '#e31a1c'
    ];
  };

  const addMapInteractions = () => {
    // Create popup
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    // Mouse enter
    ['clusters', 'unclustered-point', 'property-points'].forEach(layer => {
      if (map.current.getLayer(layer)) {
        map.current.on('mouseenter', layer, (e) => {
          map.current.getCanvas().style.cursor = 'pointer';
          
          if (layer === 'clusters') {
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();
            const pointCount = feature.properties.point_count;
            
            popup
              .setLngLat(coordinates)
              .setHTML(`<strong>${pointCount} properties</strong><br/>Click to zoom`)
              .addTo(map.current);
          } else {
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();
            const props = feature.properties;
            
            const html = createPopupHTML(props);
            
            popup
              .setLngLat(coordinates)
              .setHTML(html)
              .addTo(map.current);
          }
        });

        map.current.on('mouseleave', layer, () => {
          map.current.getCanvas().style.cursor = '';
          popup.remove();
        });
      }
    });

    // Click interactions
    if (map.current.getLayer('clusters')) {
      map.current.on('click', 'clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('properties').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (!err) {
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        });
      });
    }

    // Individual point clicks
    ['unclustered-point', 'property-points'].forEach(layer => {
      if (map.current.getLayer(layer)) {
        map.current.on('click', layer, (e) => {
          const feature = e.features[0];
          const propertyId = feature.properties.id;
          
          // Navigate to property detail
          window.open(`/property/${propertyId}`, '_blank');
        });
      }
    });
  };

  const createPopupHTML = (props) => {
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    };

    const formatNumber = (value) => {
      return new Intl.NumberFormat('en-US').format(value);
    };

    return `
      <div style="min-width: 200px;">
        <strong>${props.address}</strong><br/>
        <small>BBL: ${props.bbl}</small><br/>
        <div style="margin: 8px 0;">
          <strong>Borough:</strong> ${props.borough}<br/>
          <strong>Zone:</strong> ${props.zone}<br/>
          <strong>Lot Area:</strong> ${formatNumber(props.lotarea)} sq ft<br/>
          <strong>Assessment:</strong> ${formatCurrency(props.assesstot)}<br/>
          <strong>Dev. Potential:</strong> ${formatNumber(props.developmentPotential)} sq ft
        </div>
        <a href="/property/${props.id}" target="_blank" style="color: #1976d2;">View Details →</a>
      </div>
    `;
  };

  const clearMap = () => {
    // Remove existing layers and sources
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point', 'property-points'];
    layersToRemove.forEach(layer => {
      if (map.current.getLayer(layer)) {
        map.current.removeLayer(layer);
      }
    });

    if (map.current.getSource('properties')) {
      map.current.removeSource('properties');
    }

    // Clear markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  };

  const fitMapToProperties = (geojson) => {
    if (geojson.features.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    geojson.features.forEach(feature => {
      bounds.extend(feature.geometry.coordinates);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15
    });
  };

  const handleStyleChange = (newStyle) => {
    setMapStyle(newStyle);
    if (map.current) {
      map.current.setStyle(newStyle);
      map.current.once('styledata', () => {
        addPropertiesToMap();
      });
    }
  };

  const mapStyles = [
    { value: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
    { value: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' }
  ];

  const colorOptions = [
    { value: 'development_potential', label: 'Development Potential' },
    { value: 'value_ratio', label: 'Land Value Ratio' },
    { value: 'assesstot', label: 'Total Assessment' },
    { value: 'lotarea', label: 'Lot Area' }
  ];

  return (
    <Paper elevation={3} sx={{ position: 'relative', height, width: '100%' }}>
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
          <Alert severity="error" sx={{ maxWidth: 400 }}>
            {mapError}
            {mapError.includes('token') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Get a free token at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer">mapbox.com</a>
              </Typography>
            )}
          </Alert>
        </Box>
      )}

      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {/* Map Controls */}
      {showControls && !mapError && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 2,
            backgroundColor: 'white',
            padding: 2,
            borderRadius: 1,
            boxShadow: 1,
            minWidth: 200
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Map Controls
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
                size="small"
              />
            }
            label="Cluster Points"
            sx={{ display: 'block', mb: 1 }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Color By</InputLabel>
            <Select
              value={colorBy}
              label="Color By"
              onChange={(e) => setColorBy(e.target.value)}
            >
              {colorOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Map Style</InputLabel>
            <Select
              value={mapStyle}
              label="Map Style"
              onChange={(e) => handleStyleChange(e.target.value)}
            >
              {mapStyles.map(style => (
                <MenuItem key={style.value} value={style.value}>
                  {style.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Legend */}
      {!mapError && (
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
          <Typography variant="caption" display="block">
            <strong>{colorOptions.find(opt => opt.value === colorBy)?.label}:</strong>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5
            }}
          >
            <Box sx={{ height: 8, width: 8, backgroundColor: '#ffffcc', borderRadius: '50%' }} />
            <Typography variant="caption">Low</Typography>
            <Box sx={{ height: 8, width: 8, backgroundColor: '#feb24c', borderRadius: '50%' }} />
            <Typography variant="caption">Med</Typography>
            <Box sx={{ height: 8, width: 8, backgroundColor: '#e31a1c', borderRadius: '50%' }} />
            <Typography variant="caption">High</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default PropertyMap;