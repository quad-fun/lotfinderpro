// client/src/components/ExportMenu.jsx
import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { 
  FaFileExport, 
  FaFileCsv, 
  FaFileExcel, 
  FaChartBar,
  FaInfoCircle
} from 'react-icons/fa';

import { exportPropertiesToCSV, formatPropertiesForExport } from '../utils/exportUtils';

function ExportMenu({ properties, disabled }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportType, setExportType] = useState('basic');

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportDialogOpen = () => {
    handleClose();
    setDialogOpen(true);
  };

  const handleExportDialogClose = () => {
    setDialogOpen(false);
  };

  const handleExportTypeChange = (event) => {
    setExportType(event.target.value);
  };

  const handleExportCSV = () => {
    const formattedData = formatPropertiesForExport(properties, exportType);
    exportPropertiesToCSV(formattedData, `property-data-${exportType}`);
    handleExportDialogClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FaFileExport />}
        onClick={handleClick}
        disabled={disabled || !properties || properties.length === 0}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleExportDialogOpen}>
          <ListItemIcon>
            <FaFileCsv />
          </ListItemIcon>
          <ListItemText>Export to CSV</ListItemText>
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon>
            <FaFileExcel />
          </ListItemIcon>
          <ListItemText>Export to Excel</ListItemText>
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon>
            <FaChartBar />
          </ListItemIcon>
          <ListItemText>Create Visualization</ListItemText>
        </MenuItem>
      </Menu>

      {/* Export Options Dialog */}
      <Dialog open={dialogOpen} onClose={handleExportDialogClose}>
        <DialogTitle>Export Properties</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Select the type of data you want to export:
          </DialogContentText>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <RadioGroup value={exportType} onChange={handleExportTypeChange}>
              <FormControlLabel 
                value="basic" 
                control={<Radio />} 
                label="Basic Property Information" 
              />
              <FormControlLabel 
                value="detailed" 
                control={<Radio />} 
                label="Detailed Property Information" 
              />
              <FormControlLabel 
                value="analysis" 
                control={<Radio />} 
                label="Development Analysis Data" 
              />
            </RadioGroup>
          </FormControl>
          <DialogContentText sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <FaInfoCircle style={{ marginRight: 8 }} />
            {properties?.length} properties will be exported.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExportDialogClose}>Cancel</Button>
          <Button onClick={handleExportCSV} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ExportMenu;