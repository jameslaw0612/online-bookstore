<?php
/**
 * update-book.php - Update an existing book
 * 
 * PURPOSE: Handles book updates with optional image replacement
 * - Validates required fields
 * - Updates book data in books_tbl
 * - Updates book-category associations
 * - Handles optional image replacement
 * - Returns success response with updated book data
 * 
 * ENDPOINT: POST /backend/update-book.php
 * REQUEST BODY: {
 *   book_id, title, description, author, isbn, price, stock_quantity, category_ids, 
 *   book_cover_image (optional - base64 or null)
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
        error_log("Received update-book request with data: " . json_encode($data));

        /**
         * STEP 1: Validate all required fields
         */
        $required_fields = ['book_id', 'title', 'description', 'author', 'isbn', 'price', 'stock_quantity', 'category_ids'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || ($field !== 'book_cover_image' && $data[$field] === '')) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
                exit();
            }
        }

        // Extract data from request
        $book_id = intval($data['book_id']);
        $title = $data['title'];
        $author = $data['author'];
        $description = $data['description'];
        $isbn = $data['isbn'];
        $price = floatval($data['price']);
        $stock_quantity = intval($data['stock_quantity']);
        $category_ids = is_array($data['category_ids']) ? $data['category_ids'] : [];
        $book_cover_image = $data['book_cover_image'] ?? null; // Can be null or base64

        // Validate category_ids is not empty
        if (empty($category_ids)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'At least one category is required']);
            exit();
        }

        // Convert all category IDs to integers
        $category_ids = array_map('intval', $category_ids);

        error_log("Updating book - ID: $book_id, Title: $title, Author: $author, ISBN: $isbn");

        /**
         * STEP 2: Check if book exists
         */
        $checkStmt = $conn->prepare("SELECT book_id, book_cover_image FROM books_tbl WHERE book_id = :book_id");
        $checkStmt->execute([':book_id' => $book_id]);
        
        if ($checkStmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Book not found']);
            exit();
        }

        $existingBook = $checkStmt->fetch(PDO::FETCH_ASSOC);
        $existing_image = $existingBook['book_cover_image'];
        $image_filename = $existing_image;

        /**
         * STEP 3: Process and save new book cover image if provided
         */
        if ($book_cover_image && is_string($book_cover_image) && strpos($book_cover_image, 'data:image') === 0) {
            error_log("Processing new base64 image...");
            
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
            
            // Generate unique filename
            $image_filename = 'book_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $image_type;
            $image_path = $uploads_dir . '/' . $image_filename;
            
            error_log("Saving new image to: $image_path");
            
            // Save image file
            if (file_put_contents($image_path, $image_data) === false) {
                throw new Exception("Failed to save book cover image to: $image_path");
            }
            
            error_log("Successfully saved new image: $image_filename");
            
            // Delete old image file if it exists
            if ($existing_image && file_exists($uploads_dir . '/' . $existing_image)) {
                error_log("Deleting old image file: " . $existing_image);
                if (unlink($uploads_dir . '/' . $existing_image)) {
                    error_log("Old image file deleted successfully");
                } else {
                    error_log("Warning: Failed to delete old image file: " . $existing_image);
                }
            }
        }

        /**
         * STEP 4: Update book in books_tbl
         */
        error_log("Updating book in database...");
        
        $updateStmt = $conn->prepare(
            "UPDATE books_tbl 
             SET title_fld = :title, 
                 author_fld = :author, 
                 description_fld = :description, 
                 isbn_fld = :isbn, 
                 price_fld = :price, 
                 stock_qty_fld = :stock_qty,
                 book_cover_image = :book_cover_image
             WHERE book_id = :book_id"
        );
        
        if (!$updateStmt) {
            error_log("Failed to prepare update statement. PDO Error: " . json_encode($conn->errorInfo()));
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: Failed to prepare update statement',
                'error' => $conn->errorInfo()
            ]);
            exit();
        }
        
        $execute_result = $updateStmt->execute([
            ':title' => $title,
            ':author' => $author,
            ':description' => $description,
            ':isbn' => $isbn,
            ':price' => $price,
            ':stock_qty' => $stock_quantity,
            ':book_cover_image' => $image_filename,
            ':book_id' => $book_id
        ]);

        if (!$execute_result) {
            error_log("Failed to execute update statement. PDO Error: " . json_encode($updateStmt->errorInfo()));
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: Failed to execute update statement',
                'error' => $updateStmt->errorInfo()
            ]);
            exit();
        }

        error_log("Book updated in database");

        /**
         * STEP 5: Update book-category associations
         */
        error_log("Updating category associations for book $book_id...");
        
        // Delete existing associations
        $deleteCatStmt = $conn->prepare("DELETE FROM book_categories_tbl WHERE book_id = :book_id");
        if (!$deleteCatStmt) {
            error_log("Failed to prepare delete categories statement. PDO Error: " . json_encode($conn->errorInfo()));
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: Failed to prepare delete statement',
                'error' => $conn->errorInfo()
            ]);
            exit();
        }
        
        $delete_result = $deleteCatStmt->execute([':book_id' => $book_id]);
        if (!$delete_result) {
            error_log("Failed to delete old categories. PDO Error: " . json_encode($deleteCatStmt->errorInfo()));
        }
        
        // Insert new associations
        $categoryStmt = $conn->prepare(
            "INSERT INTO book_categories_tbl (book_id, category_id) 
             VALUES (:book_id, :category_id)"
        );
        
        if (!$categoryStmt) {
            error_log("Failed to prepare insert categories statement. PDO Error: " . json_encode($conn->errorInfo()));
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: Failed to prepare insert categories statement',
                'error' => $conn->errorInfo()
            ]);
            exit();
        }
        
        foreach ($category_ids as $category_id) {
            $cat_result = $categoryStmt->execute([
                ':book_id' => $book_id,
                ':category_id' => $category_id
            ]);
            if (!$cat_result) {
                error_log("Failed to insert category $category_id. PDO Error: " . json_encode($categoryStmt->errorInfo()));
            } else {
                error_log("Linked book $book_id to category $category_id");
            }
        }

        /**
         * STEP 6: Return success response
         */
        error_log("Book update successful!");
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Book updated successfully',
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
        error_log("Update book error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error updating book: ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
