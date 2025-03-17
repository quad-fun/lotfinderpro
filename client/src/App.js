// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { createClient } from '@supabase/supabase-js';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Layout
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import PropertySearch from './pages/PropertySearch';
import PropertyDetail from './pages/PropertyDetail';
import SavedSearches from './pages/SavedSearches';
import OpportunityFinder from './pages/OpportunityFinder';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// Private route wrapper
const PrivateRoute = ({ children }) => {
  const user = supabase.auth.getUser();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <Router>
            <AuthProvider supabase={supabase}>
              <Routes>
                {/* Auth routes (outside layout) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Main app routes (with layout) */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="search" element={<PropertySearch />} />
                  <Route path="property/:id" element={<PropertyDetail />} />
                  
                  {/* Protected routes */}
                  <Route path="saved" element={
                    <PrivateRoute>
                      <SavedSearches />
                    </PrivateRoute>
                  } />
                  
                  <Route path="opportunities" element={<OpportunityFinder />} />
                  
                  <Route path="profile" element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  } />
                </Route>
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AuthProvider>
          </Router>
        </ToastProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

export default App;