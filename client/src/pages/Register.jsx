// src/pages/Register.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Register() {
  return (
    <div>
      <h2>Register</h2>
      <p>Registration form coming soon...</p>
      <p>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}

export default Register;