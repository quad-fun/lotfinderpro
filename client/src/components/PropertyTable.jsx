// client/src/components/PropertyTable.jsx
import React, { useMemo } from 'react';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, TablePagination, TableSortLabel,
  IconButton, Box, Tooltip
} from '@mui/material';
import { FaEye, FaStar, FaRegStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
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
  properties, 
  page, 
  pageSize, 
  totalCount, 
  onPageChange, 
  onPageSizeChange 
}) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState({});

  // Define columns
  const columns = useMemo(() => [
    {
      Header: 'BBL',
      accessor: 'bbl',
      Cell: ({ value }) => value
    },
    {
      Header: 'Address',
      accessor: 'address',
      Cell: ({ value }) => value || 'N/A'
    },
    {
      Header: 'Borough',
      accessor: 'borough'
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
      Cell: ({ value }) => value?.toFixed(2) || 'N/A'
    },
    {
      Header: 'Max FAR',
      accessor: 'residfar',
      Cell: ({ value }) => value?.toFixed(2) || 'N/A'
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

  // Toggle favorite status
  const toggleFavorite = async (propertyId) => {
    try {
      if (!user) return;
      
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

  // Set up react-table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page: tablePage
  } = useTable(
    {
      columns,
      data: properties || [],
      initialState: { pageIndex: page, pageSize }
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
    onPageSizeChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  if (!properties || properties.length === 0) {
    return <div>No properties found matching your criteria.</div>;
  }

  return (
    <Paper elevation={2}>
      <TableContainer>
        <Table {...getTableProps()}>
          <TableHead>
            {headerGroups.map(headerGroup => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <TableCell
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    sx={{ fontWeight: 'bold' }}
                  >
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
            {tablePage.map(row => {
              prepareRow(row);
              return (
                <TableRow {...row.getRowProps()}>
                  {row.cells.map(cell => (
                    <TableCell {...cell.getCellProps()}>
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