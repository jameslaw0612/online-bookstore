<?php
/**
 * create-book.php - Create a new book in the catalog
 * 
 * PURPOSE: Handles book creation with image upload
 * - Validates required fields
 * - Saves book cover image to server
 * - Inserts book data into books_tbl
 * - Links book to multiple categories via book_categories_tbl
 * - Returns success response with book data
 * 
 * ENDPOINT: POST /backend/create-book.php
 * REQUEST BODY: {
 *   title, description, isbn, price, stock_quantity, category_ids (array),
 *   book_cover_image (base64 string)
 * }
 * RESPONSE: {success: boolean, message: string, book: object}
 */

require_once 'db.php';

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);

        // Log received data for debugging
        error_log("Received create-book request with data: " . json_encode($data));

        /**
         * STEP 1: Validate all required fields
         */
        $required_fields = ['title', 'description', 'author', 'isbn', 'price', 'stock_quantity', 'category_ids', 'book_cover_image'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
                exit();
            }
        }

        // Extract data from request (matching books_tbl _fld schema)
        $title = $data['title'];
        $author = $data['author'];
        $description = $data['description'];
        $isbn = $data['isbn'];
        $price = floatval($data['price']);
        $stock_quantity = intval($data['stock_quantity']);
        $category_ids = is_array($data['category_ids']) ? $data['category_ids'] : [];
        
        // Validate that category_ids is not empty
        if (empty($category_ids)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'At least one category is required']);
            exit();
        }
        
        // Convert all category IDs to integers and validate
        $category_ids = array_map('intval', $category_ids);
        
        $book_cover_image = $data['book_cover_image']; // base64 encoded image

        error_log("Extracted data - Title: $title, Author: $author, ISBN: $isbn, Categories: " . json_encode($category_ids));

        /**
         * STEP 2: Validate ISBN uniqueness
         */
        $checkStmt = $conn->prepare("SELECT book_id FROM books_tbl WHERE isbn_fld = :isbn");
        $checkStmt->execute([':isbn' => $isbn]);
        
        if ($checkStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ISBN already exists']);
            exit();
        }

        /**
         * STEP 3: Process and save book cover image
         */
        $image_filename = null;
        
        if ($book_cover_image && strpos($book_cover_image, 'data:image') === 0) {
            error_log("Processing base64 image...");
            
            // Extract base64 data and file type
            preg_match('/data:image\/(\w+);base64,/', $book_cover_image, $matches);
            $image_type = $matches[1] ?? 'jpg';
            
            // Extract base64 content
            $base64_data = substr($book_cover_image, strpos($book_cover_image, ',') + 1);
            $image_data = base64_decode($base64_data, true);
            
            if ($image_data === false) {
                throw new Exception("Failed to decode base64 image data");
            }
            
            // Create uploads directory if it doesn't exist
            $uploads_dir = __DIR__ . '/uploads/books';
            if (!is_dir($uploads_dir)) {
                if (!mkdir($uploads_dir, 0777, true)) {
                    throw new Exception("Failed to create uploads directory: $uploads_dir");
                }
                error_log("Created uploads directory: $uploads_dir");
            }
            
            // Verify directory is writable
            if (!is_writable($uploads_dir)) {
                throw new Exception("Uploads directory is not writable: $uploads_dir");
            }
            
            // Generate unique filename
            $image_filename = 'book_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $image_type;
            $image_path = $uploads_dir . '/' . $image_filename;
            
            error_log("Saving image to: $image_path");
            
            // Save image file
            if (file_put_contents($image_path, $image_data) === false) {
                throw new Exception("Failed to save book cover image to: $image_path");
            }
            
            error_log("Successfully saved image: $image_filename");
        } else {
            throw new Exception("Invalid or missing book cover image data");
        }

        /**
         * STEP 4: Insert book into books_tbl (using _fld column names)
         */
        error_log("Inserting book into database...");
        
        $insertStmt = $conn->prepare(
            "INSERT INTO books_tbl (title_fld, author_fld, description_fld, isbn_fld, price_fld, stock_qty_fld, book_cover_image) 
             VALUES (:title, :author, :description, :isbn, :price, :stock_qty, :book_cover_image)"
        );
        
        $insertStmt->execute([
            ':title' => $title,
            ':author' => $author,
            ':description' => $description,
            ':isbn' => $isbn,
            ':price' => $price,
            ':stock_qty' => $stock_quantity,
            ':book_cover_image' => $image_filename
        ]);

        $book_id = $conn->lastInsertId();
        error_log("Book created with ID: $book_id");

        /**
         * STEP 5: Link book to categories (multiple categories)
         */
        error_log("Linking book to " . count($category_ids) . " categories...");
        
        $categoryStmt = $conn->prepare(
            "INSERT INTO book_categories_tbl (book_id, category_id) 
             VALUES (:book_id, :category_id)"
        );
        
        foreach ($category_ids as $category_id) {
            $categoryStmt->execute([
                ':book_id' => $book_id,
                ':category_id' => $category_id
            ]);
            error_log("Linked book $book_id to category $category_id");
        }

        /**
         * STEP 6: Return success response
         */
        error_log("Book creation successful!");
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Book created successfully',
            'book' => [
                'book_id' => $book_id,
                'title' => $title,
                'author' => $author,
                'description' => $description,
                'isbn' => $isbn,
                'price' => $price,
                'stock_quantity' => $stock_quantity,
                'category_ids' => $category_ids,
                'book_cover_image' => $image_filename
            ]
        ]);

    } catch (Exception $e) {
        error_log("Create book error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error creating book: ' . $e->getMessage(),
            'error_details' => [
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
