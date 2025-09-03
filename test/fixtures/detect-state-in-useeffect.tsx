import React, { useState, useEffect, useMemo } from 'react';

// BAD: Derived state stored via useEffect
export function BadFilteredList({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // This should be computed during render
  useEffect(() => {
    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  return (
    <div>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      {filteredProducts.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}

// BAD: Computed totals stored in state
export function BadTotalPrice({ items }: { items: Item[] }) {
  const [totalPrice, setTotalPrice] = useState(0);
  const [_itemCount, setItemCount] = useState(0);
  const [_averagePrice, setAveragePrice] = useState(0);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    setTotalPrice(total);
    setItemCount(items.length);
    setAveragePrice(items.length > 0 ? total / items.length : 0);
  }, [items]);

  return <div>Total: ${totalPrice}</div>;
}

// BAD: Formatted values stored in state
export function BadFormattedDate({ date }: { date: Date }) {
  const [formattedDate, setFormattedDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');

  useEffect(() => {
    setFormattedDate(date.toLocaleDateString());
    setDayOfWeek(date.toLocaleDateString('en-US', { weekday: 'long' }));
  }, [date]);

  return (
    <div>
      {formattedDate} - {dayOfWeek}
    </div>
  );
}

// BAD: Boolean computations stored in state
export function BadDerivedBooleans({ todos }: { todos: Todo[] }) {
  const [_hasCompletedTodos, setHasCompletedTodos] = useState(false);
  const [_allCompleted, setAllCompleted] = useState(false);
  const [_someCompleted, setSomeCompleted] = useState(false);
  const [percentComplete, setPercentComplete] = useState(0);

  useEffect(() => {
    const completed = todos.filter((t) => t.completed);
    setHasCompletedTodos(completed.length > 0);
    setAllCompleted(todos.length > 0 && completed.length === todos.length);
    setSomeCompleted(completed.length > 0 && completed.length < todos.length);
    setPercentComplete(todos.length > 0 ? (completed.length / todos.length) * 100 : 0);
  }, [todos]);

  return <div>{percentComplete}% complete</div>;
}

// GOOD: External API call (legitimate use of useEffect)
export function GoodAPIFetch({ userId }: { userId: string }) {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUserData)
      .finally(() => setLoading(false));
  }, [userId]);

  return loading ? <div>Loading...</div> : <div>{userData?.name}</div>;
}

// GOOD: LocalStorage sync (legitimate use)
export function GoodLocalStorageSync() {
  const [preferences, setPreferences] = useState<Preferences>({});

  useEffect(() => {
    const saved = window.localStorage.getItem('preferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('preferences', JSON.stringify(preferences));
  }, [preferences]);

  return <div>Theme: {preferences.theme}</div>;
}

// GOOD: Event listener subscription (legitimate use)
export function GoodWindowResize() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div>Width: {windowSize.width}</div>;
}

// GOOD: Timer-based updates (legitimate use)
export function GoodTimer() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <div>{time.toLocaleTimeString()}</div>;
}

// GOOD: WebSocket subscription (legitimate use)
export function GoodWebSocket({ url }: { url: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const ws = new window.WebSocket(url);

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, JSON.parse(event.data)]);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return <div>{messages.length} messages</div>;
}

// GOOD: Computing during render (correct pattern)
export function GoodComputedDuringRender({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Computed during render - no useEffect needed
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      {filteredProducts.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}

// GOOD: Using useMemo for expensive computations (correct pattern)
export function GoodUseMemo({ items }: { items: Item[] }) {
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);

  const stats = useMemo(
    () => ({
      count: items.length,
      average: items.length > 0 ? totalPrice / items.length : 0,
      max: Math.max(...items.map((i) => i.price)),
      min: Math.min(...items.map((i) => i.price)),
    }),
    [items, totalPrice]
  );

  return (
    <div>
      Total: ${totalPrice}, Average: ${stats.average}
    </div>
  );
}

// Types for the examples
interface Product {
  id: string;
  name: string;
  price: number;
}

interface Item {
  id: string;
  price: number;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface User {
  id: string;
  name: string;
}

interface Preferences {
  theme?: string;
}

interface Message {
  id: string;
  text: string;
}

// Mock functions for examples
async function fetchUser(userId: string): Promise<User> {
  return { id: userId, name: 'User' };
}
