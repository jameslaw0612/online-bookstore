/**
 * Home.tsx - User Home Page with Book Catalog
 * 
 * PURPOSE: Main user page after successful login
 * - Displays a catalog of all available books in a clean professional grid
 * - Each book shows: cover image, title, author, price
 * - Sidebar with category filters and price range slider
 * - Sort and display controls
 * - Protected by ProtectedRoute in App.tsx
 */

import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Book, BookX, ChevronRight, LayoutGrid, List } from 'lucide-react';
import BookDetailsModal from '../components/BookDetailsModal';
import UserCartDrawer from '../components/UserCartDrawer';
import UserTopBar from '../components/UserTopBar';
import '../styles/Home.css';

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

interface Category {
  category_id: number;
  category_name: string;
}

export default function Home() {
  const location = useLocation();

  // Books & categories state
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(10000);
  const [filterPriceMin, setFilterPriceMin] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(10000);

  // Sort & display state
  const [sortBy, setSortBy] = useState('latest');
  const [showCount, setShowCount] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

  // Modal state
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  /**
   * Handle book card click - fetch fresh book data and open modal
   */
  const handleBookSelect = async (book: Book) => {
    try {
      const response = await fetch(`/backend/get-book-by-id.php?book_id=${book.book_id}`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.book) {
        setSelectedBook(data.book);
      } else {
        // Fallback: use the book from the list if endpoint fails
        setSelectedBook(book);
      }
    } catch (err) {
      console.error('Error loading book details:', err);
      // Fallback: use the book from the list if endpoint fails
      setSelectedBook(book);
    }
  };

  /**
   * Fetch books and categories on mount
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [booksRes, catsRes] = await Promise.all([
          fetch('/backend/list-books.php'),
          fetch('/backend/get-categories.php')
        ]);

        const booksData = await booksRes.json();
        const catsData = await catsRes.json();

        if (booksData.success) {
          setBooks(booksData.books);
          if (booksData.books.length > 0) {
            const prices = booksData.books.map((b: Book) => b.price);
            const minP = Math.floor(Math.min(...prices));
            const maxP = Math.ceil(Math.max(...prices));
            setPriceMin(minP);
            setPriceMax(maxP);
            setFilterPriceMin(minP);
            setFilterPriceMax(maxP);
          }
        }

        if (catsData.success) {
          setCategories(catsData.categories);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const queryFromUrl = new URLSearchParams(location.search).get('search') ?? '';
    setSearchQuery(queryFromUrl);
    setAppliedSearchQuery(queryFromUrl);
  }, [location.search]);

  /**
   * Filter and sort books
   */
  const filteredBooks = useMemo(() => {
    let result = books.filter(book => {
      // Search filter (manual submission)
      if (appliedSearchQuery.trim() !== '') {
        const query = appliedSearchQuery.toLowerCase();
        const matchesTitle = book.title.toLowerCase().includes(query);
        const matchesAuthor = book.author.toLowerCase().includes(query);
        if (!matchesTitle && !matchesAuthor) return false;
      }
      // Price filter
      if (book.price < filterPriceMin || book.price > filterPriceMax) {
        return false;
      }
      // Category filter
      if (selectedCategories.length > 0) {
        const bookCatIds = book.categories.map(c => c.category_id);
        if (!selectedCategories.some(id => bookCatIds.includes(id))) return false;
      }
      return true;
    });

    // Sort
    switch (sortBy) {
      case 'latest':
        result.sort((a, b) => b.book_id - a.book_id);
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [books, selectedCategories, filterPriceMin, filterPriceMax, sortBy, appliedSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / showCount));

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * showCount;
    return filteredBooks.slice(startIndex, startIndex + showCount);
  }, [currentPage, filteredBooks, showCount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, filterPriceMin, filterPriceMax, sortBy, appliedSearchQuery, showCount]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getVisiblePageItems = () => {
    if (totalPages <= 8) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, 2, 3, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setFilterPriceMin(priceMin);
    setFilterPriceMax(priceMax);
    setSearchQuery('');
    setAppliedSearchQuery('');
  };

  const handleSearchSubmit = () => {
    setAppliedSearchQuery(searchQuery.trim());
  };

  return (
    <div className="home-container">
      <UserTopBar
        activeNav="home"
        cartOpen={isCartOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={() => {
          setSearchQuery('');
          setAppliedSearchQuery('');
        }}
        onCartClick={() => setIsCartOpen(prev => !prev)}
      />

      {/* MAIN CONTENT */}
      <main className="home-main">
        <div className="home-layout">
          {/* FILTER SIDEBAR */}
          <aside className="filter-sidebar">
            {/* Category Filter */}
            <div className="filter-card">
              <h3 className="filter-title">Categories</h3>
              <div className="category-list">
                {categories.map(cat => (
                  <label key={cat.category_id} className="category-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.category_id)}
                      onChange={() => handleCategoryToggle(cat.category_id)}
                    />
                    <span className="category-name">{cat.category_name}</span>
                  </label>
                ))}
                {categories.length === 0 && !loading && (
                  <p className="no-items-text">No categories available</p>
                )}
              </div>
            </div>

            {/* Price Filter */}
            <div className="filter-card">
              <h3 className="filter-title">Filter By Price</h3>
              <div className="price-slider-container">
                <div className="dual-range-slider">
                  <div
                    className="slider-track-fill"
                    style={{
                      left: `${((filterPriceMin - priceMin) / (priceMax - priceMin || 1)) * 100}%`,
                      right: `${100 - ((filterPriceMax - priceMin) / (priceMax - priceMin || 1)) * 100}%`
                    }}
                  ></div>
                  <input
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    value={filterPriceMin}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), filterPriceMax - 1);
                      setFilterPriceMin(val);
                    }}
                    className="range-input range-min"
                  />
                  <input
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    value={filterPriceMax}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), filterPriceMin + 1);
                      setFilterPriceMax(val);
                    }}
                    className="range-input range-max"
                  />
                </div>
                <p className="price-display">
                  Price: <span className="price-val">₱{filterPriceMin.toLocaleString()}</span> — <span className="price-val">₱{filterPriceMax.toLocaleString()}</span>
                </p>
              </div>
            </div>

            {/* Reset Filters */}
            {(selectedCategories.length > 0 || filterPriceMin !== priceMin || filterPriceMax !== priceMax) && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={handleResetFilters}
              >
                ✕ Reset All Filters
              </button>
            )}
          </aside>

          {/* BOOKS CATALOG */}
          <section className="books-catalog">
            {/* Toolbar */}
            <div className="catalog-toolbar">
              <div className="toolbar-left">
                <button
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <List size={16} />
                </button>
              </div>
              <div className="toolbar-right">
                <div className="toolbar-select">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="latest">Sort by latest</option>
                    <option value="price-low">Sort by price: low to high</option>
                    <option value="price-high">Sort by price: high to low</option>
                    <option value="title">Sort by title</option>
                  </select>
                </div>
                <div className="toolbar-select">
                  <select value={showCount} onChange={(e) => setShowCount(Number(e.target.value))}>
                    <option value={8}>Show 8</option>
                    <option value={12}>Show 12</option>
                    <option value={20}>Show 20</option>
                    <option value={100}>Show All</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Book Grid */}
            {loading ? (
              <div className="catalog-loading">
                <div className="loading-spinner"></div>
                <p>Loading books...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="catalog-empty">
                <p className="empty-msg">
                  <BookX size={48} className="empty-icon" />
                  No books found matching your filters.
                </p>
                {(selectedCategories.length > 0 || filterPriceMin !== priceMin || filterPriceMax !== priceMax) && (
                  <button type="button" className="reset-filters-btn" onClick={handleResetFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="books-grid">
                {paginatedBooks.map(book => (
                  <div 
                    key={book.book_id} 
                    className="book-card"
                    onClick={() => handleBookSelect(book)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="book-cover-wrap">
                      {book.book_cover_image ? (
                        <img
                          src={`/backend/uploads/books/${book.book_cover_image}`}
                          alt={book.title}
                          className="book-cover-img"
                        />
                      ) : (
                        <div className="book-cover-empty">
                          <Book size={48} />
                        </div>
                      )}
                    </div>
                    <div className="book-meta">
                      <h4 className="book-title">{book.title}</h4>
                      <p className="book-author">{book.author}</p>
                      <p className="book-price">₱{book.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="books-list">
                {paginatedBooks.map(book => (
                  <div 
                    key={book.book_id} 
                    className="book-list-item"
                    onClick={() => handleBookSelect(book)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="book-list-cover-wrap">
                      {book.book_cover_image ? (
                        <img
                          src={`/backend/uploads/books/${book.book_cover_image}`}
                          alt={book.title}
                          className="book-list-cover-img"
                        />
                      ) : (
                        <div className="book-list-cover-empty">
                          <Book size={40} />
                        </div>
                      )}
                    </div>
                    <div className="book-list-info">
                      <h4 className="book-title">{book.title}</h4>
                      <p className="book-author">{book.author}</p>
                      <p className="book-description">{book.description}</p>
                      <p className="book-price">₱{book.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredBooks.length > 0 && totalPages > 1 && (
              <div className="catalog-pagination">
                <div className="pagination-pages">
                  {getVisiblePageItems().map((item, index) => (
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`pagination-page ${currentPage === item ? 'active' : ''}`}
                        onClick={() => setCurrentPage(item as number)}
                      >
                        {item}
                      </button>
                    )
                  ))}
                </div>

                <button
                  type="button"
                  className="pagination-next"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span>NEXT</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Book Details Modal */}
      <BookDetailsModal 
        book={selectedBook}
        isOpen={selectedBook !== null}
        onClose={() => setSelectedBook(null)}
        allBooks={books}
        onSelectBook={setSelectedBook}
      />
      <UserCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
