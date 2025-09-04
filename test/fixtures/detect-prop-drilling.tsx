import React, { useState, createContext, useContext } from 'react';

// Bad Pattern: Prop Drilling through multiple layers
// user and onUserUpdate are passed through Dashboard and Sidebar without being used
function _BadApp() {
  const [user, setUser] = useState({ name: 'John', role: 'admin' });
  const [theme, setTheme] = useState('light');

  return <Dashboard user={user} onUserUpdate={setUser} theme={theme} onThemeChange={setTheme} />;
}

// Dashboard doesn't use user or onUserUpdate - just passes them down
function Dashboard({ user, onUserUpdate, theme, _onThemeChange }) {
  // Uses theme but not user
  return (
    <div className={`dashboard ${theme}`}>
      <Sidebar user={user} onUserUpdate={onUserUpdate} currentTheme={theme} />
    </div>
  );
}

// Sidebar doesn't use user or onUserUpdate either - just passes them down
function Sidebar({ user, onUserUpdate, currentTheme }) {
  return (
    <aside className={`sidebar ${currentTheme}`}>
      <UserProfile user={user} onUserUpdate={onUserUpdate} />
    </aside>
  );
}

// UserProfile finally uses the props
function UserProfile({ user, onUserUpdate }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>Role: {user.role}</p>
      <button onClick={() => onUserUpdate({ ...user, name: 'Jane' })}>Update Name</button>
    </div>
  );
}

// Bad Pattern: Multiple props drilled
function _BadProductApp() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, _setIsLoading] = useState(false);

  return (
    <ProductLayout
      selectedProduct={selectedProduct}
      onProductSelect={setSelectedProduct}
      cartItems={cartItems}
      onAddToCart={setCartItems}
      isLoading={isLoading}
    />
  );
}

function ProductLayout({ selectedProduct, onProductSelect, cartItems, onAddToCart, isLoading }) {
  // Only uses isLoading
  if (isLoading) return <div>Loading...</div>;

  return (
    <ProductGrid
      selectedProduct={selectedProduct}
      onProductSelect={onProductSelect}
      cartItems={cartItems}
      onAddToCart={onAddToCart}
    />
  );
}

function ProductGrid({ selectedProduct, onProductSelect, cartItems, onAddToCart }) {
  // Doesn't use any of these props
  return (
    <div className="grid">
      <ProductCard
        selectedProduct={selectedProduct}
        onProductSelect={onProductSelect}
        cartItems={cartItems}
        onAddToCart={onAddToCart}
      />
    </div>
  );
}

function ProductCard({ selectedProduct, onProductSelect, cartItems, onAddToCart }) {
  // Finally uses the props
  return (
    <div className="card">
      {selectedProduct && <h4>{selectedProduct.name}</h4>}
      <button onClick={() => onProductSelect({ id: 1, name: 'Product' })}>Select</button>
      <button onClick={() => onAddToCart([...cartItems, selectedProduct])}>
        Add to Cart ({cartItems.length})
      </button>
    </div>
  );
}

// Bad Pattern: Props object drilling
function _BadFormApp() {
  const formData = {
    firstName: '',
    lastName: '',
    email: '',
  };

  const handleSubmit = (data: any) => console.log(data);

  return <FormWrapper formData={formData} onSubmit={handleSubmit} />;
}

function FormWrapper(props: any) {
  // Doesn't use props directly, just passes them
  return (
    <div className="wrapper">
      <FormContainer {...props} />
    </div>
  );
}

function FormContainer(props: any) {
  // Also just passes props through
  return (
    <div className="container">
      <ActualForm formData={props.formData} onSubmit={props.onSubmit} />
    </div>
  );
}

function ActualForm({ formData, onSubmit }) {
  // Finally uses the props
  return (
    <form onSubmit={() => onSubmit(formData)}>
      <input value={formData.firstName} />
      <input value={formData.lastName} />
      <input value={formData.email} />
    </form>
  );
}

// Good Pattern: Using Context API
const UserContext = createContext<any>(null);

function _GoodAppWithContext() {
  const [user, setUser] = useState({ name: 'John', role: 'admin' });

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <GoodDashboard />
    </UserContext.Provider>
  );
}

function GoodDashboard() {
  // No props needed
  return (
    <div className="dashboard">
      <GoodSidebar />
    </div>
  );
}

function GoodSidebar() {
  // No props needed
  return (
    <aside className="sidebar">
      <GoodUserProfile />
    </aside>
  );
}

function GoodUserProfile() {
  // Get data directly from context
  const { user, setUser } = useContext(UserContext);

  return (
    <div>
      <h3>{user.name}</h3>
      <p>Role: {user.role}</p>
      <button onClick={() => setUser({ ...user, name: 'Jane' })}>Update Name</button>
    </div>
  );
}

// Good Pattern: Component Composition
function _GoodAppWithComposition() {
  const [user, setUser] = useState({ name: 'John', role: 'admin' });

  return (
    <ComposedDashboard>
      <ComposedSidebar>
        <ComposedUserProfile user={user} onUserUpdate={setUser} />
      </ComposedSidebar>
    </ComposedDashboard>
  );
}

function ComposedDashboard({ children }) {
  return <div className="dashboard">{children}</div>;
}

function ComposedSidebar({ children }) {
  return <aside className="sidebar">{children}</aside>;
}

function ComposedUserProfile({ user, onUserUpdate }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>Role: {user.role}</p>
      <button onClick={() => onUserUpdate({ ...user, name: 'Jane' })}>Update Name</button>
    </div>
  );
}

// Good Pattern: Props used at each level
function _GoodAppWithUsedProps() {
  const [user, setUser] = useState({ name: 'John', role: 'admin' });

  return <UsefulDashboard user={user} onUserUpdate={setUser} />;
}

function UsefulDashboard({ user, onUserUpdate }) {
  // Actually uses user here
  const isAdmin = user.role === 'admin';

  return (
    <div className="dashboard">
      {isAdmin && <div>Admin Panel</div>}
      <UsefulSidebar user={user} onUserUpdate={onUserUpdate} />
    </div>
  );
}

function UsefulSidebar({ user, onUserUpdate }) {
  // Also uses user here
  const displayName = user.name.toUpperCase();

  return (
    <aside className="sidebar">
      <h2>Welcome, {displayName}!</h2>
      <UsefulUserProfile user={user} onUserUpdate={onUserUpdate} />
    </aside>
  );
}

function UsefulUserProfile({ user, onUserUpdate }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>Role: {user.role}</p>
      <button onClick={() => onUserUpdate({ ...user, name: 'Jane' })}>Update Name</button>
    </div>
  );
}

// Edge Case: Intentional prop forwarding (like HOCs or wrapper components)
function withAuth(Component: any) {
  return function AuthWrapper(props: any) {
    const isAuthenticated = true; // Some auth logic

    if (!isAuthenticated) {
      return <div>Please login</div>;
    }

    // Intentionally forwarding all props
    return <Component {...props} />;
  };
}

const _AuthenticatedProfile = withAuth(UserProfile);

// Edge Case: Library-like component that needs to forward props
function _Button({ onClick, children, ...restProps }) {
  // This is intentional forwarding for a reusable component
  return (
    <button onClick={onClick} {...restProps}>
      {children}
    </button>
  );
}

// TypeScript example with explicit prop types
interface UserProps {
  user: {
    name: string;
    role: string;
  };
  onUpdate: (user: any) => void;
}

const _TypedBadDashboard: React.FC<UserProps> = ({ user, onUpdate }) => {
  // Doesn't use props, just passes them
  return <TypedBadSidebar user={user} onUpdate={onUpdate} />;
};

const TypedBadSidebar: React.FC<UserProps> = ({ user, onUpdate }) => {
  // Also doesn't use props
  return <TypedProfile user={user} onUpdate={onUpdate} />;
};

const TypedProfile: React.FC<UserProps> = ({ user, onUpdate }) => {
  // Finally uses the props
  return (
    <div>
      {user.name}
      <button onClick={() => onUpdate(user)}>Update</button>
    </div>
  );
};
