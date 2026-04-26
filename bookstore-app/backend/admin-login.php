<?php
/**
 * admin-login.php - Admin Authentication API Endpoint
 * 
 * PURPOSE: Authenticates admin users
 * - Validates email and password
 * - Verifies password using bcrypt
 * - Checks if user has 'admin' role
 * - Retrieves admin data from database
 * - Decrypts phone number from encrypted storage
 * - Generates authentication token
 * - Returns admin data and token to frontend
 * 
 * ENDPOINT: POST /backend/admin-login.php
 * REQUEST BODY: {email, password}
 * RESPONSE: {success: boolean, message: string, token: string, admin: object}
 * 
 * ON SUCCESS:
 * - Frontend stores token and admin data in localStorage
 * - Frontend redirected to /admin/dashboard page
 * 
 * ON FAILURE:
 * - Returns error message (e.g., "User not found", "Invalid password", "Not an admin")
 * - Frontend stays on admin login page
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
 * MAIN ADMIN LOGIN LOGIC - Only execute for POST requests
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
        if (!isset($data['email']) || !isset($data['password'])) {
            // Missing required fields
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        // Extract credentials from request array using bracket notation
        $email = $data['email'];        // Admin's email address
        $password = $data['password'];  // Admin's password (will verify against hash)

        /**
         * STEP 2: Query database for admin user with matching email
         * Uses LEFT JOIN to get admin's name from user_name_tbl
         * Also checks that user has 'admin' role
         * Also retrieves encrypted phone components
         */
        $stmt = $conn->prepare("
            SELECT ua.account_id, ua.email, ua.password_hash, ua.role, ua.phone_encrypted, ua.phone_iv, ua.phone_tag, un.fname_fld, un.lname_fld 
            FROM user_account_tbl ua
            LEFT JOIN user_name_tbl un ON ua.name_id = un.name_id
            WHERE ua.email = :email AND ua.role = 'admin'
        ");
        
        $stmt->execute([':email' => $email]);

        /**
         * STEP 3: Check if admin user exists
         * If no rows returned, either email not found or user is not admin
         */
        if ($stmt->rowCount() === 0) {
            // Admin user not found
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Admin user not found or invalid credentials']);
            exit;
        }

        // Use $stmt->fetch() to retrieve the first (and only) row as associative array
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        /**
         * STEP 4: Verify password using bcrypt
         * Use password_verify($inputPassword, $storedHash) to check if passwords match
         * password_verify() handles the salt internally and compares securely
         */
        if (!password_verify($password, $admin['password_hash'])) {
            // Password doesn't match
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
            exit;
        }

        /**
         * STEP 5: Decrypt phone number from encrypted storage
         * Phone is stored as three base64-encoded components (encrypted, iv, tag)
         * decryptFromStorage() reconstructs the original phone number
         */
        $decryptedPhone = EncryptionUtil::decryptFromStorage(
            $admin['phone_encrypted'],
            $admin['phone_iv'],
            $admin['phone_tag']
        );

        /**
         * STEP 6: Generate authentication token
         * Token format: email_account_id_timestamp
         * Can be replaced with JWT if needed for production
         */
        $token = bin2hex(random_bytes(16)); // Generate random 32-character hex string

        /**
         * STEP 7: Return success response
         * HTTP 200 = OK (authentication successful)
         * Include admin data and token for frontend storage
         */
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Admin login successful',
            'token' => $token,
            'admin' => [
                'account_id' => $admin['account_id'],
                'fname' => $admin['fname_fld'],
                'lname' => $admin['lname_fld'],
                'email' => $admin['email'],
                'phone' => $decryptedPhone,
                'role' => $admin['role']
            ]
        ]);

    } catch (Exception $e) {
        // Handle any database or encryption errors
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error: ' . $e->getMessage()
        ]);
    }
} else {
    // Request method not POST
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
