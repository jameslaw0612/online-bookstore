import '../styles/UserCartDrawer.css';

interface UserCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserCartDrawer({ isOpen, onClose }: UserCartDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="cart-drawer-overlay"
        aria-label="Close cart panel"
        onClick={onClose}
      />
      <aside className="cart-drawer" aria-label="Items on cart">
        <div className="cart-drawer__header">
          <div>
            <p className="cart-drawer__eyebrow">Your Cart</p>
            <h2>Items on Cart</h2>
          </div>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={onClose}
            aria-label="Close cart panel"
          >
            ×
          </button>
        </div>

        <div className="cart-drawer__body">
          <div className="cart-drawer__empty">
            <p className="cart-drawer__empty-title">Your cart is empty.</p>
            <p className="cart-drawer__empty-copy">
              When shoppers start adding books, we can show them here in this
              slide-in panel without changing the top navigation.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
