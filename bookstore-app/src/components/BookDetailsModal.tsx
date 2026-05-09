import { useState, useEffect, useMemo } from 'react';
import { X, Minus, Plus, ShoppingCart, Book as BookIcon } from 'lucide-react';
import '../styles/BookDetailsModal.css';

interface BookCategory {
  category_id: number;
  category_name: string;
}

interface Book {
  book_id: number;
  title: string;
  author: string;
  description: string;
  isbn: string;
  price: number;
  stock_quantity: number;
  book_cover_image: string | null;
  categories: BookCategory[];
}

interface BookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  allBooks: Book[];
  onSelectBook: (book: Book) => void;
}

export default function BookDetailsModal({ book, isOpen, onClose, allBooks, onSelectBook }: BookDetailsModalProps) {
  const [quantity, setQuantity] = useState(1);

  // Compute related books
  const relatedBooks = useMemo(() => {
    if (!book || !allBooks.length) return [];
    
    const currentCategoryIds = new Set(book.categories.map(c => c.category_id));
    
    // Find books that share categories and count how many they share
    const matches = allBooks
      .filter(b => b.book_id !== book.book_id)
      .map(b => {
        const sharedCount = b.categories.filter(c => currentCategoryIds.has(c.category_id)).length;
        return { book: b, sharedCount };
      })
      .filter(m => m.sharedCount > 0)
      .sort((a, b) => b.sharedCount - a.sharedCount) // Higher shared count comes first
      .map(m => m.book);
    
    return matches.slice(0, 3);
  }, [book, allBooks]);

  // Reset quantity when a new book is opened
  useEffect(() => {
    if (book) {
      setQuantity(book.stock_quantity > 0 ? 1 : 0);
      // Scroll to top of modal content when book changes
      const content = document.querySelector('.bd-content');
      if (content) content.scrollTop = 0;
    }
  }, [book, isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !book) return null;

  const inStock = book.stock_quantity > 0;

  const handleIncrement = () => {
    if (quantity < book.stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    // UI functionality only for now as per plan
    alert(`Added ${quantity} of "${book.title}" to cart!`);
    onClose();
  };

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="bd-overlay" onClick={onClose}>
      <div className="bd-content" onClick={handleModalClick}>
        <button className="bd-close-btn" onClick={onClose} title="Close">
          <X size={24} />
        </button>

        <div className="bd-body">
          {/* Left Column: Image */}
          <div className="bd-image-col">
            <div className="bd-main-image">
              {inStock ? (
                <span className="stock-badge in-stock bd-badge">IN STOCK</span>
              ) : (
                <span className="stock-badge out-of-stock bd-badge">OUT OF STOCK</span>
              )}
              {book.book_cover_image ? (
                <img 
                  src={`/backend/uploads/books/${book.book_cover_image}`} 
                  alt={book.title} 
                />
              ) : (
                <div className="empty-cover">
                  <BookIcon size={64} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="bd-details-col">
            <h2 className="bd-title">{book.title}</h2>
            
            <div className="bd-meta">
              <span className="meta-label">Author:</span> <span className="meta-value">{book.author}</span>
              <span className="meta-divider">|</span>
              <span className="meta-label">SKU:</span> <span className="meta-value">{book.isbn || `B${book.book_id}`}</span>
            </div>

            {book.categories && book.categories.length > 0 && (
              <div className="bd-categories">
                {book.categories.map(cat => (
                  <span key={cat.category_id} className="bd-category-pill">
                    {cat.category_name}
                  </span>
                ))}
              </div>
            )}

            <div className="bd-price">
              ₱{book.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div className="bd-description">
              <p>{book.description}</p>
            </div>

            <div className="bd-actions">
              <div className="action-row">
                <div className="quantity-col">
                  <span className="quantity-label">Quantity</span>
                  <div className="quantity-selector">
                    <button 
                      className="qty-btn" 
                      onClick={handleDecrement}
                      disabled={!inStock || quantity <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="qty-value">{quantity}</span>
                    <button 
                      className="qty-btn" 
                      onClick={handleIncrement}
                      disabled={!inStock || quantity >= book.stock_quantity}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                
                <button 
                  className="btn-add-to-cart"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                >
                  <ShoppingCart size={18} />
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedBooks.length > 0 && (
          <div className="bd-related">
            <div className="related-header">
              <h3>Related products</h3>
              <div className="header-line"></div>
            </div>
            
            <div className="related-grid">
              {relatedBooks.map((relBook, index) => (
                <div 
                  key={relBook.book_id} 
                  className={`related-item ${index < relatedBooks.length - 1 ? 'has-divider' : ''}`}
                  onClick={() => onSelectBook(relBook)}
                >
                  <div className="related-img">
                    {relBook.book_cover_image ? (
                      <img src={`/backend/uploads/books/${relBook.book_cover_image}`} alt={relBook.title} />
                    ) : (
                      <div className="related-empty-img"><BookIcon size={32} /></div>
                    )}
                  </div>
                  <h4 className="related-title" title={relBook.title}>{relBook.title}</h4>
                  <p className="related-author">{relBook.author}</p>
                  <p className="related-price">₱{relBook.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
