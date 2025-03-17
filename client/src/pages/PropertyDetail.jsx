// src/pages/PropertyDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom';

function PropertyDetail() {
  const { id } = useParams();
  
  return (
    <div>
      <h2>Property Detail</h2>
      <p>Property ID: {id}</p>
      <p>Details coming soon...</p>
    </div>
  );
}

export default PropertyDetail;