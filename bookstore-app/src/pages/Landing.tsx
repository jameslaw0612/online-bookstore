/**
 * Landing.tsx - Welcome/Home Page Component
 * 
 * PURPOSE: Displays the landing page when users first visit http://localhost:5173/
 * - Shows welcome message and bookstore branding
 * - Provides buttons to navigate to Login or Register pages
 * - This page is accessible to everyone (no authentication required)
 */

import { Link } from 'react-router-dom';
import webLogo from '../assets/Web_Logo/center version.png';
import '../styles/Landing.css';

export default function Landing() {
  return (
    // Main container for the landing page
    <div className="landing-container">
      <div className="landing-content">
        {/* Bookstore Logo */}
        <img src={webLogo} alt="Bookstore Logo" className="landing-logo" />
        
        {/* Tagline/subtitle describing the application */}
        <p>Your ultimate destination for discovering great books</p>
        
        {/* Container for navigation buttons */}
        <div className="landing-buttons">
          {/* Use Link component from React Router to navigate without full page reload */}
          {/* The 'to' prop specifies the target page route (/login) */}
          {/* Link component creates client-side navigation for better performance */}
          {/* Users with existing accounts click this to authenticate */}
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
          
          {/* Use Link component from React Router to navigate to register page */}
          {/* The 'to' prop specifies the target page route (/register) */}
          {/* New users click this to create an account */}
          <Link to="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
