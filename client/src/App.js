// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createClient } from '@supabase/supabase-js';

// Pages
import PropertyDetail from './pages/PropertyDetail';
import SavedSearches from './pages/SavedSearches';
import OpportunityFinder from './pages/OpportunityFinder';
import Profile from './pages/Profile';
import Register from './pages/Register';

// Context providers
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
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <div className="App">
            <header className="App-header">
              <h1>LotFinder Pro</h1>
              <p>Property Analysis Tool for Real Estate Professionals</p>
            </header>
            <main>
              <Routes>
                <Route path="/" element={<div>Welcome to LotFinder Pro!</div>} />
                <Route path="/property/:id" element={<PropertyDetail />} />
                <Route path="/saved" element={<SavedSearches />} />
                <Route path="/opportunities" element={<OpportunityFinder />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;