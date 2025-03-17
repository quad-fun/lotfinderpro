// client/src/pages/Profile.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch
} from '@mui/material';
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaBell,
  FaMapMarkerAlt,
  FaSave,
  FaSignOutAlt,
  FaSearch,
  FaBuilding
} from 'react-icons/fa';

// Auth context
import { useAuth } from '../contexts/AuthContext';

function Profile() {
  const { user, updatePassword, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form for profile info
  const profileForm = useForm({
    defaultValues: {
      email: user?.email || '',
      fullName: user?.user_metadata?.full_name || '',
      phone: user?.user_metadata?.phone || ''
    }
  });
  
  // Form for password change
  const passwordForm = useForm();
  
  // Notification preferences (in a real app, these would be fetched from the database)
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailAlerts: true,
    savedSearchAlerts: true,
    marketUpdates: false,
    newOpportunities: true
  });
  
  // Handle notification toggle
  const handleNotificationToggle = (setting) => {
    setNotificationPrefs({
      ...notificationPrefs,
      [setting]: !notificationPrefs[setting]
    });
    
    // In a real app, you would save these preferences to the database
    setSuccessMessage('Notification preferences updated');
  };
  
  // Handle profile update
  const handleProfileUpdate = async (data) => {
    try {
      // In a real app, this would call the updateUser function
      console.log('Profile data to update:', data);
      
      setSuccessMessage('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile');
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (data) => {
    try {
      if (data.newPassword !== data.confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }
      
      await updatePassword(data.newPassword);
      passwordForm.reset();
      setSuccessMessage('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      setErrorMessage('Failed to update password');
    }
  };
  
  if (!user) {
    return (
      <Alert severity="warning">
        You must be logged in to view this page.
      </Alert>
    );
  }
  
  return (
    <Box>
      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
      
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>
      
      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  margin: '0 auto',
                  bgcolor: 'primary.main',
                  mb: 2
                }}
              >
                {user.email?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6">{user.user_metadata?.full_name || 'User'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </CardContent>
          </Card>
          
          <Paper>
            <List component="nav">
              <ListItem
                button
                selected={activeSection === 'profile'}
                onClick={() => setActiveSection('profile')}
              >
                <ListItemIcon>
                  <FaUser />
                </ListItemIcon>
                <ListItemText primary="Profile Information" />
              </ListItem>
              
              <ListItem
                button
                selected={activeSection === 'security'}
                onClick={() => setActiveSection('security')}
              >
                <ListItemIcon>
                  <FaLock />
                </ListItemIcon>
                <ListItemText primary="Security" />
              </ListItem>
              
              <ListItem
                button
                selected={activeSection === 'notifications'}
                onClick={() => setActiveSection('notifications')}
              >
                <ListItemIcon>
                  <FaBell />
                </ListItemIcon>
                <ListItemText primary="Notifications" />
              </ListItem>
              
              <Divider />
              
              <ListItem button onClick={signOut}>
                <ListItemIcon>
                  <FaSignOutAlt />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        
        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            {/* Profile Information */}
            {activeSection === 'profile' && (
              <Box component="form" onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Email Address"
                      fullWidth
                      disabled
                      {...profileForm.register('email')}
                      InputProps={{
                        startAdornment: <FaEnvelope style={{ marginRight: 8 }} />,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Full Name"
                      fullWidth
                      {...profileForm.register('fullName')}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone Number"
                      fullWidth
                      {...profileForm.register('phone')}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Address"
                      fullWidth
                      {...profileForm.register('address')}
                      InputProps={{
                        startAdornment: <FaMapMarkerAlt style={{ marginRight: 8 }} />,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<FaSave />}
                    >
                      Save Changes
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* Security Settings */}
            {activeSection === 'security' && (
              <Box component="form" onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Change Password
                    </Typography>
                    
                    <TextField
                      label="Current Password"
                      type="password"
                      fullWidth
                      margin="normal"
                      {...passwordForm.register('currentPassword', { required: true })}
                    />
                    
                    <TextField
                      label="New Password"
                      type="password"
                      fullWidth
                      margin="normal"
                      {...passwordForm.register('newPassword', { 
                        required: true,
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters'
                        }
                      })}
                      error={!!passwordForm.formState.errors.newPassword}
                      helperText={passwordForm.formState.errors.newPassword?.message}
                    />
                    
                    <TextField
                      label="Confirm New Password"
                      type="password"
                      fullWidth
                      margin="normal"
                      {...passwordForm.register('confirmPassword', { required: true })}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<FaSave />}
                    >
                      Update Password
                    </Button>
                  </Grid>
                </Grid>
                
                <Box mt={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Account Security
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Two-Factor Authentication"
                        secondary="Add an extra layer of security to your account"
                      />
                      <ListItemSecondaryAction>
                        <Button variant="outlined" size="small">
                          Enable
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <ListItem>
                      <ListItemText
                        primary="Active Sessions"
                        secondary="View and manage your active login sessions"
                      />
                      <ListItemSecondaryAction>
                        <Button variant="outlined" size="small">
                          Manage
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Box>
              </Box>
            )}
            
            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <FaEnvelope />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email Notifications"
                      secondary="Receive important alerts via email"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={notificationPrefs.emailAlerts}
                        onChange={() => handleNotificationToggle('emailAlerts')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <FaSearch />
                    </ListItemIcon>
                    <ListItemText
                      primary="Saved Search Alerts"
                      secondary="Get notified when new properties match your saved searches"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={notificationPrefs.savedSearchAlerts}
                        onChange={() => handleNotificationToggle('savedSearchAlerts')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <FaBuilding />
                    </ListItemIcon>
                    <ListItemText
                      primary="Market Updates"
                      secondary="Receive periodic real estate market updates"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={notificationPrefs.marketUpdates}
                        onChange={() => handleNotificationToggle('marketUpdates')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <FaBell />
                    </ListItemIcon>
                    <ListItemText
                      primary="New Opportunity Alerts"
                      secondary="Get notified about new investment opportunities"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={notificationPrefs.newOpportunities}
                        onChange={() => handleNotificationToggle('newOpportunities')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Profile;