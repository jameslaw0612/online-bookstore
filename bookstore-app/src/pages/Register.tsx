/**
 * Register.tsx - User Registration Page Component
 * 
 * PURPOSE: Handles user registration with validation
 * - Validates password strength (8+ chars, uppercase, number, symbol)
 * - Validates names (no numbers allowed)
 * - Validates email (must contain @)
 * - Sends registration request to backend PHP API
 * - Shows progressive error messages for each validation failure
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Check, X, Eye, EyeOff } from 'lucide-react';
import '../styles/Auth.css';

/**
 * PASSWORD VALIDATION FUNCTION
 * Checks if password meets all security requirements
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 number (0-9)
 * - At least 1 symbol (!@#$%^&* etc.)
 * 
 * @param password - The password string to validate
 * @returns Object with isValid boolean and array of error messages
 */
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  // Use regex .test() method with /[A-Z]/ pattern to check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  // Use regex .test() method with /[0-9]/ pattern to check for digit
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  // Use regex .test() method to check for special symbol characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least 1 symbol (!@#$%^&* etc.)');
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * NAME VALIDATION FUNCTION
 * Ensures names don't contain numbers
 * 
 * @param name - First or last name to validate
 * @returns true if name is valid (no numbers), false otherwise
 */
const validateName = (name: string): boolean => {
  // Use regex .test() method with /\d/ pattern to check for digits
  // Negation (!) inverts result to return true if NO digits found
  return !/\d/.test(name);
};

/**
 * EMAIL VALIDATION FUNCTION
 * Basic email validation - checks for @ symbol
 * 
 * @param email - Email address to validate
 * @returns true if email contains @, false otherwise
 */
const validateEmail = (email: string): boolean => {
  // Use .includes() string method to search for @ character in email
  return email.includes('@');
};

export default function Register() {
  // Use useState hook (React state management) to manage all form fields
  const [fname, setFname] = useState('');           // First name input
  const [lname, setLname] = useState('');           // Last name input
  const [email, setEmail] = useState('');           // Email input
  const [phone, setPhone] = useState('');           // Phone number input
  const [password, setPassword] = useState('');     // Password input
  const [showPassword, setShowPassword] = useState(false); // Toggle for password visibility
  const [confirmPassword, setConfirmPassword] = useState(''); // Confirm password input
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle for confirm password visibility
  const [errors, setErrors] = useState<string[]>([]); // Array to store validation error messages
  const [success, setSuccess] = useState(false);    // Flag to show success message
  const [loading, setLoading] = useState(false);    // Flag to disable form during submission
  const navigate = useNavigate();                   // Use React Router hook to navigate between pages

  /**
   * FORM SUBMISSION HANDLER
   * Validates all form inputs before sending registration request to backend
   * Progressive validation: Shows only relevant error messages
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();                   // Prevent default form submission behavior
    setErrors([]);                        // Clear previous errors

    // VALIDATION STEP 1: Check if all fields are filled
    // Use .trim() string method to remove leading/trailing whitespace before checking
    // Use logical OR (||) to check if any required field is empty
    if (!fname.trim() || !lname.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setErrors(['All fields are required']);
      return;  // Exit early if validation fails (guard clause pattern)
    }

    // VALIDATION STEP 2: Check specific field validations
    // Use array literal [] to initialize empty errors array
    const validationErrors: string[] = [];

    // Validate first name doesn't contain numbers using custom validation function
    if (!validateName(fname)) {
      // Use .push() array method to add error message to the array
      validationErrors.push('First name cannot contain numbers');
    }
    // Validate last name doesn't contain numbers using custom validation function
    if (!validateName(lname)) {
      validationErrors.push('Last name cannot contain numbers');
    }

    // Validate email contains @ using custom validation function
    if (!validateEmail(email)) {
      validationErrors.push('Email must contain @ symbol');
    }

    // Validate passwords match using strict equality (===) operator
    if (password !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    // Validate password strength (uppercase, number, symbol, 8+ chars)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      // Use spread operator (...) to unpack array of password errors into validationErrors array
      validationErrors.push(...passwordValidation.errors);
    }

    // Validate phone number length (must be exactly 10 digits) and starts with 9
    if (phone.length !== 10) {
      validationErrors.push('Phone number must be exactly 10 digits');
    } else if (phone[0] !== '9') {
      validationErrors.push('Phone number must start with 9');
    }

    // If there are any validation errors, display them and stop
    // Use .length property to check if errors array is not empty
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;  // Exit early if validation fails (guard clause pattern)
    }

    // All validations passed - proceed with registration
    setLoading(true);

    try {
      // Prepend the fixed +63 prefix to the phone number
      const fullPhone = '+63' + phone;

      // Use Fetch API (modern JavaScript) to send HTTP POST request to backend
      const response = await fetch('/backend/register.php', {
        method: 'POST',                              // HTTP POST method for sending data
        headers: {
          'Content-Type': 'application/json',        // HTTP header to specify JSON format
        },
        // Use JSON.stringify() to convert JavaScript object to JSON string format
        body: JSON.stringify({ fname, lname, email, phone: fullPhone, password }),
      });

      // Use .json() method to asynchronously parse the JSON response from backend
      const data = await response.json();

      // Check if registration was successful using truthy check
      if (data.success) {
        setSuccess(true);
        // Use setTimeout() with 2000ms (2 second) delay to give user time to see success message
        // Then use navigate() to redirect to /login page
        setTimeout(() => navigate('/login'), 2000);
      } else {
        // If registration failed, show backend error message
        // Use || operator for default value if data.message is falsy
        setErrors([data.message || 'Registration failed']);
      }
    } catch (error) {
      // If network error occurred, catch it and show generic error message
      setErrors(['An error occurred. Please try again.']);
      console.error('Error:', error);
    } finally {
      // finally block executes regardless of success or error
      // Re-enable the form (stop loading)
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="success-message">
          <h2><CheckCircle size={32} color="#27ae60" /> Registration Successful!</h2>
          <p>Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Register</h2>
        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <p key={index} className="error">
                <XCircle size={16} /> {error}
              </p>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fname">First Name</label>
            <input
              id="fname"
              type="text"
              value={fname}
              onChange={(e) => {
                // Remove any numbers from the input
                const filtered = e.target.value.replace(/\d/g, '');
                setFname(filtered);
              }}
              placeholder="Enter first name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lname">Last Name</label>
            <input
              id="lname"
              type="text"
              value={lname}
              onChange={(e) => {
                // Remove any numbers from the input
                const filtered = e.target.value.replace(/\d/g, '');
                setLname(filtered);
              }}
              placeholder="Enter last name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <div className="phone-input-wrapper">
              <span className="phone-prefix">+63</span>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  // Only allow numbers, limit to 10 digits, and ensure first digit is 9
                  let filtered = e.target.value.replace(/\D/g, '');
                  if (filtered.length > 0 && filtered[0] !== '9') {
                    // Prevent input if the first digit is not 9
                    return;
                  }
                  setPhone(filtered.slice(0, 10));
                }}
                placeholder="9XXXXXXXXX"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password && (
              <div className="password-requirements">
                <p className={password.length >= 8 ? 'valid' : 'invalid'}>
                  {password.length >= 8 ? <Check size={14} /> : <X size={14} />} At least 8 characters
                </p>
                <p className={/[A-Z]/.test(password) ? 'valid' : 'invalid'}>
                  {/[A-Z]/.test(password) ? <Check size={14} /> : <X size={14} />} At least 1 uppercase letter
                </p>
                <p className={/[0-9]/.test(password) ? 'valid' : 'invalid'}>
                  {/[0-9]/.test(password) ? <Check size={14} /> : <X size={14} />} At least 1 number
                </p>
                <p
                  className={
                    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                      ? 'valid'
                      : 'invalid'
                  }
                >
                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                    ? <Check size={14} />
                    : <X size={14} />}{' '}
                  At least 1 symbol
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="link-text">
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
}
