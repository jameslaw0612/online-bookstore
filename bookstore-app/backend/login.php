<?php
/**
 * login.php - User Authentication API Endpoint
 * 
 * PURPOSE: Authenticates registered users
 * - Validates email and password
 * - Verifies password using bcrypt
 * - Retrieves user data from database
 * - Decrypts phone number from encrypted storage
 * - Generates authentication token
 * - Returns user data and token to frontend
 * 
 * ENDPOINT: POST /backend/login.php
 * REQUEST BODY: {email, password}
 * RESPONSE: {success: boolean, message: string, token: string, user: object}
 * 
 * ON SUCCESS:
 * - Frontend stores token and user data in localStorage
 * - Frontend redirected to /home page
 * 
 * ON FAILURE:
 * - Returns error message (e.g., "User not registered", "Invalid password")
 * - Frontend stays on login page
 */

// Include database connection and encryption utilities
require_once 'db.php';
require_once 'encryption.php';

/**
 * HANDLE CORS PREFLIGHT REQUEST
 * Browser sends OPTIONS request before POST to check permissions
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * MAIN LOGIN LOGIC - Only execute for POST requests
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Use file_get_contents("php://input") to read the raw HTTP request body stream
        // Use json_decode() with true parameter to convert JSON string to PHP associative array
        $data = json_decode(file_get_contents("php://input"), true);

        /**
         * STEP 1: Validate required fields
         * Email and password must be provided
         */
        // Use isset() to check if email key exists in associative array
        if (!isset($data['email']) || !isset($data['password'])) {
            // Missing required fields
            // Use http_response_code() to set HTTP status code to 400 (Bad Request)
            http_response_code(400);
            // Use json_encode() to convert PHP array to JSON string for frontend response
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        // Extract credentials from request array using bracket notation
        $email = $data['email'];        // User's email address
        $password = $data['password'];  // User's password (will verify against hash)

        /**
         * STEP 2: Query database for user with matching email
         * Uses LEFT JOIN to get user's name from user_name_tbl
         * Also retrieves encrypted phone components
         */
        // Use $conn->prepare() to create a prepared statement with parameter placeholder :email
        // This prevents SQL injection attacks by separating SQL from user data
        $stmt = $conn->prepare("
            SELECT ua.account_id, ua.email, ua.password_hash, ua.role, ua.phone_encrypted, ua.phone_iv, ua.phone_tag, un.fname_fld, un.lname_fld 
            FROM user_account_tbl ua
            LEFT JOIN user_name_tbl un ON ua.name_id = un.name_id
            WHERE ua.email = :email
        ");
        // Use $stmt->execute() with array parameter to bind the :email placeholder
        // PDO handles escaping to prevent SQL injection
        $stmt->execute([':email' => $email]);

        // Use $stmt->rowCount() to check how many rows were returned (0 or 1)
        // If rowCount() is 0, the email doesn't exist in database
        if ($stmt->rowCount() === 0) {
            // No user found with this email
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'User not registered']);
            exit;
        }

        // Use $stmt->fetch(PDO::FETCH_ASSOC) to retrieve one row as an associative array
        // PDO::FETCH_ASSOC means column names become array keys
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        /**
         * STEP 3: Verify password
         * password_verify() checks if the plain password matches the bcrypt hash
         * This is secure because the password is one-way hashed
         */
        // Use password_verify($password, $user['password_hash']) to compare plain text with hash
        // password_verify() internally uses bcrypt algorithm - safe from timing attacks
        // Returns boolean: true if password matches, false if doesn't
        if (!password_verify($password, $user['password_hash'])) {
            // Password doesn't match
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
            exit;
        }

        /**
         * STEP 3b: Check if user has 'admin' role
         * Admin accounts must use /admin/login (admin-login.php) instead
         * This prevents role crossover between user and admin login
         */
        if (isset($user['role']) && $user['role'] === 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'This account is an admin account. Please use Admin Login.']);
            exit;
        }

        /**
         * STEP 4: Decrypt phone number from database
         * Retrieve encrypted phone and decrypt it
         * Uses EncryptionUtil::decryptFromStorage() which:
         * 1. Base64-decodes the three components
         * 2. Verifies authentication tag (detects tampering)
         * 3. Decrypts the ciphertext
         */
        $decryptedPhone = '';  // Initialize empty phone
        try {
            // Use !empty() to check if all three encryption components have non-empty values
            // empty() returns true for null, '', 0, false
            if (!empty($user['phone_encrypted']) && !empty($user['phone_iv']) && !empty($user['phone_tag'])) {
                // Use EncryptionUtil::decryptFromStorage() static method to decrypt the phone
                // This method decodes base64, verifies authentication tag, and decrypts data
                $decryptedPhone = EncryptionUtil::decryptFromStorage(
                    $user['phone_encrypted'],  // Base64-encoded encrypted phone
                    $user['phone_iv'],         // Base64-encoded initialization vector
                    $user['phone_tag']         // Base64-encoded authentication tag
                );
            }
        } catch (Exception $e) {
            // If decryption fails (corrupted data, wrong key, etc.), leave phone empty
            // This prevents login failure due to encryption issues
            $decryptedPhone = '';
        }

        /**
         * STEP 5: Generate authentication token
         * Simple random token approach (64 hex characters = 32 bytes)
         * In production, should use JWT (JSON Web Tokens) instead
         */
        // Use random_bytes(32) to generate 32 cryptographically secure random bytes
        // Use bin2hex() to convert binary bytes to hexadecimal string (64 characters)
        // Result is a unique token for this login session
        $token = bin2hex(random_bytes(32));

        /**
         * STEP 6: Return success response with user data
         * HTTP 200 = OK (login successful)
         * Frontend will:
         * 1. Store token in localStorage
         * 2. Store user data in localStorage
         * 3. Redirect to /home page
         */
        http_response_code(200);
        // Use json_encode() to convert PHP associative array to JSON string
        // Use => syntax to create key-value pairs in return object
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,  // Send token to frontend (stored in localStorage)
            'user' => [
                'account_id' => $user['account_id'],   // User's unique ID
                'fname' => $user['fname_fld'],         // First name
                'lname' => $user['lname_fld'],         // Last name
                'email' => $user['email'],             // Email address
                'phone' => $decryptedPhone             // Decrypted phone number
            ]
        ]);
    } catch (Exception $e) {
        // Use try-catch block to handle any database or decryption exceptions
        // If any error occurs, this block catches it and sends error response
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Login error: ' . $e->getMessage()  // Use . operator for string concatenation
        ]);
    }
}

/**
 * REJECT NON-POST REQUESTS
 * Only POST method is allowed for login
 */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
