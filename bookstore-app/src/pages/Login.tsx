/**
 * Login.tsx - Unified Login Page Component
 * 
 * PURPOSE: Authenticates both regular users and admin users
 * - Provides two tabs: "User Login" and "Admin Login"
 * - User tab: authenticates regular users via login.php
 * - Admin tab: authenticates admin users via admin-login.php
 * - Stores appropriate tokens and data in localStorage
 * - Redirects to /home for users or /admin/dashboard for admins
 * - Shows error messages for invalid credentials
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import '../styles/Auth.css';

export default function Login() {
  // Use useState hook to manage active tab: 'user' or 'admin'
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  
  // Use useState hook for user login form fields
  const [userEmail, setUserEmail] = useState('');        // User email input
  const [userPassword, setUserPassword] = useState('');  // User password input
  const [showUserPassword, setShowUserPassword] = useState(false); // Toggle for user password visibility
  const [userError, setUserError] = useState('');        // User login error message
  const [userLoading, setUserLoading] = useState(false); // User login loading state
  
  // Use useState hook for admin login form fields
  const [adminEmail, setAdminEmail] = useState('');        // Admin email input
  const [adminPassword, setAdminPassword] = useState('');  // Admin password input
  const [showAdminPassword, setShowAdminPassword] = useState(false); // Toggle for admin password visibility
  const [adminError, setAdminError] = useState('');        // Admin login error message
  const [adminLoading, setAdminLoading] = useState(false); // Admin login loading state
  const [isRedirecting, setIsRedirecting] = useState(false); // Success animation state
  
  const navigate = useNavigate();  // Use React Router hook to navigate

  const parseJsonResponse = async (response: Response) => {
    const rawText = await response.text();

    try {
      return JSON.parse(rawText);
    } catch {
      if (rawText.trim().startsWith('<!doctype') || rawText.trim().startsWith('<html')) {
        throw new Error('Backend returned HTML instead of JSON. Check if the PHP server is running and the Vite proxy is pointing to the correct backend URL.');
      }

      throw new Error(`Backend returned an invalid response: ${rawText.slice(0, 120)}`);
    }
  };

  /**
   * USER LOGIN SUBMISSION HANDLER
   * Sends user login credentials to backend/login.php
   */
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserLoading(true);

    try {
      const response = await fetch('/backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });

      const data = await parseJsonResponse(response);

      if (data.success && data.token) {
        // Store user authentication token and data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Show success animation and wait 1 second
        setIsRedirecting(true);
        setTimeout(() => {
          navigate('/home');
        }, 1000);
      } else if (data.success) {
        setUserError('Login succeeded but no session token was returned.');
      } else {
        setUserError(data.message || 'Login failed');
      }
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
      console.error('Error:', error);
    } finally {
      setUserLoading(false);
    }
  };

  /**
   * ADMIN LOGIN SUBMISSION HANDLER
   * Sends admin login credentials to backend/admin-login.php
   */
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    try {
      const response = await fetch('/backend/admin-login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      const data = await parseJsonResponse(response);

      if (data.success && data.token) {
        // Store admin authentication token and data
        localStorage.setItem('adminAuthToken', data.token);
        localStorage.setItem('admin', JSON.stringify(data.admin));
        
        // Show success animation and wait 1 second
        setIsRedirecting(true);
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1000);
      } else if (data.success) {
        setAdminError('Login succeeded but no session token was returned.');
      } else {
        setAdminError(data.message || 'Login failed');
      }
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
      console.error('Error:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form" style={{ position: 'relative' }}>
        {/* SUCCESS REDIRECT OVERLAY */}
        {isRedirecting && (
          <div className="login-success-overlay">
            <Loader2 className="spinner" size={40} />
            <span className="success-text">Login Successful!</span>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="login-tabs">
          <button
            className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            User Login
          </button>
          <button
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Login
          </button>
        </div>

        {/* USER LOGIN TAB */}
        {activeTab === 'user' && (
          <>
            <h2>User Login</h2>
            {userError && (
              <div className="error-banner">
                <p className="warning"><AlertCircle size={18} /> {userError}</p>
              </div>
            )}
            <form onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={userLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="user-password"
                    type={showUserPassword ? 'text' : 'password'}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={userLoading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    title={showUserPassword ? 'Hide password' : 'Show password'}
                  >
                    {showUserPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={userLoading}>
                {userLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="link-text">
              Don't have an account? <a href="/register">Register here</a>
            </p>
          </>
        )}

        {/* ADMIN LOGIN TAB */}
        {activeTab === 'admin' && (
          <>
            <h2>Admin Login</h2>
            {adminError && (
              <div className="error-banner">
                <p className="warning"><AlertCircle size={18} /> {adminError}</p>
              </div>
            )}
            <form onSubmit={handleAdminSubmit}>
              <div className="form-group">
                <label htmlFor="admin-email">Admin Email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                  disabled={adminLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="admin-password"
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={adminLoading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    title={showAdminPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={adminLoading}>
                {adminLoading ? 'Logging in...' : 'Admin Login'}
              </button>
            </form>

            <p className="link-text">
              Only admins can login here
            </p>
          </>
        )}
      </div>
    </div>
  );
}
