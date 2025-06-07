// client/src/components/PropertyTable.jsx - Fixed hooks order
import React, { useMemo, useState } from 'react';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, TablePagination, TableSortLabel,
  IconButton, Box, Tooltip, Typography
} from '@mui/material';
import { FaEye, FaStar, FaRegStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveFavoriteProperty } from '../services/supabaseService';

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

function PropertyTable({ 
  properties = [], 
  page = 0, 
  pageSize = 10, 
  totalCount = 0, 
  onPageChange = () => {}, 
  onPageSizeChange = () => {} 
}) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState({});

  // HOOKS MUST BE CALLED FIRST - BEFORE ANY EARLY RETURNS
  
  // Toggle favorite status function
  const toggleFavorite = async (propertyId) => {
    if (!user) {
      alert('Please log in to save favorites');
      return;
    }
    
    try {
      // Optimistic UI update
      setFavorites(prev => ({
        ...prev,
        [propertyId]: !prev[propertyId]
      }));
      
      // Save to database
      await saveFavoriteProperty(user.id, propertyId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update on error
      setFavorites(prev => ({
        ...prev,
        [propertyId]: !prev[propertyId]
      }));
    }
  };

  // Define columns with useMemo
  const columns = useMemo(() => [
    {
      Header: 'BBL',
      accessor: 'bbl',
      Cell: ({ value }) => value || 'N/A'
    },
    {
      Header: 'Address',
      accessor: 'address',
      Cell: ({ value }) => value || 'N/A'
    },
    {
      Header: 'Borough',
      accessor: 'borough',
      Cell: ({ value }) => value || 'N/A'
    },
    {
      Header: 'Zone',
      accessor: 'zonedist1',
      Cell: ({ value }) => value || 'N/A'
    },
    {
      Header: 'Lot Area (sq ft)',
      accessor: 'lotarea',
      Cell: ({ value }) => formatNumber(value)
    },
    {
      Header: 'Building Area (sq ft)',
      accessor: 'bldgarea',
      Cell: ({ value }) => formatNumber(value)
    },
    {
      Header: 'FAR',
      accessor: 'builtfar',
      Cell: ({ value }) => value ? value.toFixed(2) : 'N/A'
    },
    {
      Header: 'Max FAR',
      accessor: 'residfar',
      Cell: ({ value }) => value ? value.toFixed(2) : 'N/A'
    },
    {
      Header: 'Assessment',
      accessor: 'assesstot',
      Cell: ({ value }) => formatCurrency(value)
    },
    {
      Header: 'Actions',
      id: 'actions',
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="View Details">
            <IconButton
              component={Link}
              to={`/property/${row.original.id}`}
              size="small"
              color="primary"
            >
              <FaEye />
            </IconButton>
          </Tooltip>
          
          {user && (
            <Tooltip title={favorites[row.original.id] ? "Remove from Favorites" : "Add to Favorites"}>
              <IconButton
                size="small"
                color="secondary"
                onClick={() => toggleFavorite(row.original.id)}
              >
                {favorites[row.original.id] ? <FaStar /> : <FaRegStar />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ], [user, favorites]);

  // Initialize React Table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page: tablePage,
  } = useTable(
    {
      columns,
      data: Array.isArray(properties) ? properties : [],
      manualPagination: true,
      pageCount: Math.ceil(totalCount / pageSize),
      manualSortBy: true,
    },
    useSortBy,
    usePagination
  );

  // Handle page change
  const handleChangePage = (event, newPage) => {
    onPageChange(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    onPageSizeChange(newPageSize);
  };

  // NOW DO VALIDATION CHECKS AFTER ALL HOOKS
  console.log('PropertyTable received props:', {
    propertiesLength: properties?.length,
    page,
    pageSize,
    totalCount
  });
  
  // Check if properties is actually an array
  if (!Array.isArray(properties)) {
    console.error('PropertyTable: properties is not an array:', typeof properties, properties);
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="error">
          Error: Invalid properties data received
        </Typography>
      </Paper>
    );
  }
  
  // Check if properties array is empty
  if (properties.length === 0) {
    console.log('PropertyTable: No properties to display');
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No properties found matching your search criteria.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table {...getTableProps()}>
          <TableHead>
            {headerGroups.map((headerGroup, headerIndex) => (
              <TableRow {...headerGroup.getHeaderGroupProps()} key={headerIndex}>
                {headerGroup.headers.map((column, columnIndex) => (
                  <TableCell {...column.getHeaderProps(column.getSortByToggleProps())} key={columnIndex}>
                    {column.render('Header')}
                    {column.isSorted ? (
                      <TableSortLabel
                        active={column.isSorted}
                        direction={column.isSortedDesc ? 'desc' : 'asc'}
                      />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody {...getTableBodyProps()}>
            {tablePage.map((row, rowIndex) => {
              prepareRow(row);
              return (
                <TableRow {...row.getRowProps()} key={rowIndex}>
                  {row.cells.map((cell, cellIndex) => (
                    <TableCell {...cell.getCellProps()} key={cellIndex}>
                      {cell.render('Cell')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalCount || 0}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

export default PropertyTable;