import { useState } from 'react';
import UserCartDrawer from '../components/UserCartDrawer';
import UserTopBar from '../components/UserTopBar';
import '../styles/Home.css';
import '../styles/UserPages.css';

export default function UserProfile() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="home-container">
      <UserTopBar
        activeNav="profile"
        cartOpen={isCartOpen}
        onCartClick={() => setIsCartOpen(prev => !prev)}
      />

      <main className="home-main">
        <section className="user-page-placeholder">
          <p className="user-page-eyebrow">User Profile</p>
          <h1>Your profile page is coming soon.</h1>
          <p>
            We left this page intentionally empty for now. The header navigation
            is already wired, so we can plug the real profile content in next.
          </p>
        </section>
      </main>

      <UserCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
