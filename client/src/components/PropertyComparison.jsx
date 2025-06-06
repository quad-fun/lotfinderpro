// client/src/components/PropertyComparison.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  FaTrash, 
  FaSearch, 
  FaFileCsv 
} from 'react-icons/fa';

// Import only the functions we know exist
import { getPropertyById } from '../services/supabaseService';

// Simple BBL search function using direct Supabase query
const searchPropertiesByBbl = async (bbl) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/properties?bbl=eq.${bbl}&limit=10`, {
      headers: {
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to search properties');
    }
    
    return await response.json();
  } catch (error) {
    console.error('BBL search error:', error);
    return [];
  }
};

// Simple CSV export function
const exportPropertiesToCSV = (properties, filename) => {
  if (!properties || properties.length === 0) return;
  
  try {
    // Get all unique keys from all properties
    const allKeys = [...new Set(properties.flatMap(p => Object.keys(p)))];
    
    // Create CSV content
    const headers = allKeys.join(',');
    const rows = properties.map(property => 
      allKeys.map(key => {
        const value = property[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('CSV export error:', error);
    alert('Failed to export CSV');
  }
};

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

function PropertyComparison({ initialProperties = [] }) {
  const [properties, setProperties] = useState(initialProperties);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Helper function to check if we should highlight a value as the best
  const isBestValue = (field, value, isHigherBetter = true) => {
    if (value === null || value === undefined || properties.length < 2) return false;