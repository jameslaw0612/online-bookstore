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
import { useNavigate } from 'react-router-dom';
import { Book, BookX, LayoutGrid, List, Search, X } from 'lucide-react';
import BookDetailsModal from '../components/BookDetailsModal';
import '../styles/Home.css';
import sideLogo from '../assets/Web_Logo/side version.png';

// TypeScript interfaces
interface User {
  fname: string;
  lname: string;
  email: string;
}

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
  // User state
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

  // Modal state
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  /**
   * Load user info from localStorage for navbar greeting
   */
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

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

    return result.slice(0, showCount);
  }, [books, selectedCategories, filterPriceMin, filterPriceMax, sortBy, showCount, appliedSearchQuery]);

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
    setAppliedSearchQuery(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch('/backend/logout.php', {
        method: 'POST',
        headers,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="home-container">
      {/* NAVIGATION BAR */}
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="logo" style={{ height: '70px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <img src={sideLogo} alt="Bookstore Logo" className="logo-image" style={{ height: '140px', objectFit: 'contain' }} />
          </h1>

          <div className="nav-center">
            <div className="search-bar-container">
              <input
                type="text"
                placeholder="Search products..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="search-actions">
                {(searchQuery || appliedSearchQuery) && (
                  <button
                    className="clear-search-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setAppliedSearchQuery('');
                    }}
                    title="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
                <button
                  className="search-submit-btn"
                  onClick={handleSearchSubmit}
                >
                  <Search size={20} />
                </button>
              </div>
            </div>
          </div>
          <div className="nav-right">
            {user && (
              <span className="welcome-text">
                Welcome, {user.fname}!
              </span>
            )}
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </nav>

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
                <button type="button" className="filter-link-btn">
                  FILTER
                </button>
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
                {filteredBooks.map(book => (
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
                {filteredBooks.map(book => (
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
    </div>
  );
}
