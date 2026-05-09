import { useState } from 'react';
import UserCartDrawer from '../components/UserCartDrawer';
import UserTopBar from '../components/UserTopBar';
import '../styles/Home.css';
import '../styles/UserPages.css';

export default function UserTransactions() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="home-container">
      <UserTopBar
        activeNav="transactions"
        cartOpen={isCartOpen}
        onCartClick={() => setIsCartOpen(prev => !prev)}
      />

      <main className="home-main">
        <section className="user-page-placeholder">
          <p className="user-page-eyebrow">Transactions</p>
          <h1>Your transactions page is coming soon.</h1>
          <p>
            This placeholder is ready for future order history, receipts, and
            payment details once we add that workflow.
          </p>
        </section>
      </main>

      <UserCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
