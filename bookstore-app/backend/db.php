<?php
/**
 * db.php - Database Connection File
 * 
 * PURPOSE: Establishes connection to MySQL database
 * - Sets up CORS headers for React frontend communication
 * - Handles preflight OPTIONS requests
 * - Creates PDO connection to bookstore_db
 * - Returns error if connection fails
 */

/**
 * CORS HEADERS SECTION
 * Allows React frontend (running on localhost:5173) to communicate with PHP backend
 * These headers must be sent BEFORE any other output
 */

// Use header() function to send HTTP header to client
// Set Access-Control-Allow-Origin header to allow cross-origin requests from any domain
header("Access-Control-Allow-Origin: *");

// Use header() to specify which HTTP methods are allowed (GET, POST, PUT, DELETE, OPTIONS)
// Browser sends preflight request asking which methods are allowed
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// Use header() to specify which request headers are allowed (Content-Type, Authorization)
// Browser includes these headers in actual requests after preflight
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Use header() to cache preflight response for 3600 seconds (1 hour)
// Reduces number of preflight requests, improving performance
header("Access-Control-Max-Age: 3600");

// Use header() to set Content-Type response header to JSON
// Tells browser/client to expect JSON formatted response
header("Content-Type: application/json; charset=utf-8");

/**
 * HANDLE PREFLIGHT REQUESTS
 * Browser sends OPTIONS request before actual POST/PUT/DELETE requests
 * We need to respond with 200 OK and the above headers to allow the actual request
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Use http_response_code() to set HTTP status code to 200 OK
    http_response_code(200);
    // Use exit() to stop script execution after sending preflight response
    exit();
}

/**
 * ERROR LOGGING CONFIGURATION
 * Don't display errors directly to users (security risk)
 * Instead, log errors to a file
 */
// Use ini_set() to configure PHP settings
// First parameter: setting name, second parameter: value
// Set display_errors to 0 to hide errors from users (production security best practice)
ini_set('display_errors', 0);
// Use ini_set() to enable error logging functionality
ini_set('log_errors', 1);
// Use ini_set() with error_log setting to specify where PHP logs errors
// Use __DIR__ magic constant to get current directory path
// Combine with '/error.log' to create full path
ini_set('error_log', __DIR__ . '/error.log');
// Use error_reporting constant E_ALL to report all types of errors (fatal, warning, deprecated, etc.)
error_reporting(E_ALL);

/**
 * DATABASE CONFIGURATION
 * Define connection parameters for MySQL database
 */
// Use define() function to create constants for database configuration
// Constants cannot be changed once defined
define('DB_HOST', 'localhost');      // Database server address
define('DB_USER', 'root');           // MySQL username
define('DB_PASSWORD', '');           // MySQL password (empty for local development)
define('DB_NAME', 'bookstore_db');   // Database name

/**
 * ESTABLISH DATABASE CONNECTION
 * Uses PDO (PHP Data Objects) for secure prepared statements
 * Prepared statements prevent SQL injection attacks
 */
try {
    // Use string concatenation (.) operator to build DSN string from constants
    // DSN format: 'mysql:host=localhost;dbname=bookstore_db;charset=utf8mb4'
    // utf8mb4 charset supports emojis and all Unicode characters
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    
    // Use new PDO() constructor to create database connection object
    // Parameters: DSN (connection string), username, password
    // PDO handles database operations and prepared statements
    $conn = new PDO($dsn, DB_USER, DB_PASSWORD);
    
    // Use $conn->setAttribute() method to configure PDO behavior
    // First parameter: PDO::ATTR_ERRMODE (error handling mode)
    // Second parameter: PDO::ERRMODE_EXCEPTION (throw exceptions on errors)
    // This ensures database errors throw exceptions that can be caught
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
} catch (PDOException $e) {
    // Use catch block to handle PDOException thrown during connection
    // PDOException is thrown when database connection fails
    http_response_code(500);
    // Use json_encode() to convert array to JSON error response
    // Use . operator for string concatenation with exception message
    echo json_encode([
        'success' => false, 
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    // Use exit() to stop script execution after sending error
    exit();
}
?>
