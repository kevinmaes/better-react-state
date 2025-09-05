import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import useSWR from 'swr';

// BAD: Manual fetch with useState for loading/error/data
export function BadManualFetch({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [userId]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{user?.name}</div>;
}

// BAD: Axios with manual state management
export function BadAxiosPattern() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError('');

    axios
      .get('/api/products')
      .then(({ data }) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {loading && <div>Loading products...</div>}
      {error && <div>Error: {error}</div>}
      {products.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}

// BAD: Multiple related server states
export function BadMultipleServerStates() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  useEffect(() => {
    // Fetch users
    setIsLoadingUsers(true);
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setIsLoadingUsers(false);
      });

    // Fetch posts
    setIsLoadingPosts(true);
    fetch('/api/posts')
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        setIsLoadingPosts(false);
      });

    // Fetch comments
    setIsLoadingComments(true);
    fetch('/api/comments')
      .then((res) => res.json())
      .then((data) => {
        setComments(data);
        setIsLoadingComments(false);
      });
  }, []);

  return <div>Data loaded</div>;
}

// BAD: GraphQL query with manual state
export function BadGraphQLPattern({ id }: { id: string }) {
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    client
      .query({
        query: GET_USER_QUERY,
        variables: { id },
      })
      .then((result) => {
        setData(result.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [id]);

  return <div>{data?.user?.name}</div>;
}

// BAD: Async function in useEffect
export function BadAsyncPattern({ categoryId }: { categoryId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      setFetching(true);
      try {
        const response = await fetch(`/api/categories/${categoryId}/items`);
        const data = await response.json();
        setItems(data);
      } finally {
        setFetching(false);
      }
    };

    loadItems();
  }, [categoryId]);

  return <div>{items.length} items</div>;
}

// BAD: Missing refetch capability
export function BadNoRefetch() {
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This only fetches once, no way to refetch on demand
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setUserData(data);
        setIsLoading(false);
      });
  }, []); // Empty deps, never refetches

  // No way to refresh the data
  return <div>{userData?.name}</div>;
}

// BAD: Server data in component state (passed from parent)
export function BadServerDataInProps({ initialOrders }: { initialOrders: Order[] }) {
  // Server data being managed in local state
  const [orders, setOrders] = useState(initialOrders);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = async () => {
    setLoadingMore(true);
    const response = await fetch('/api/orders?page=2');
    const newOrders = await response.json();
    setOrders([...orders, ...newOrders]);
    setLoadingMore(false);
  };

  return (
    <div>
      {orders.map((o) => (
        <div key={o.id}>{o.id}</div>
      ))}
      <button onClick={loadMore} disabled={loadingMore}>
        Load More
      </button>
    </div>
  );
}

// GOOD: Using React Query
export function GoodReactQuery({ userId }: { userId: string }) {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((res) => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  return <div>{user?.name}</div>;
}

// GOOD: Using SWR
export function GoodSWR({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useSWR(`/api/users/${userId}`, fetcher);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{user?.name}</div>;
}

// GOOD: Multiple queries with React Query
export function GoodMultipleQueries() {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((res) => res.json()),
  });

  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetch('/api/posts').then((res) => res.json()),
  });

  if (usersQuery.isLoading || postsQuery.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      Users: {usersQuery.data?.length}
      Posts: {postsQuery.data?.length}
    </div>
  );
}

// GOOD: Mutations with React Query
export function GoodMutation() {
  const mutation = useMutation({
    mutationFn: (newUser: User) =>
      fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      }).then((res) => res.json()),
  });

  return (
    <button onClick={() => mutation.mutate({ id: '1', name: 'New User' })}>Create User</button>
  );
}

// GOOD: Client-only state (legitimate useState)
export function GoodClientState() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // These are all UI state, not server state
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      <select value={selectedTab} onChange={(e) => setSelectedTab(e.target.value)}>
        <option value="profile">Profile</option>
        <option value="settings">Settings</option>
      </select>
    </div>
  );
}

// GOOD: Form state (legitimate useState)
export function GoodFormState() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state is client state, not server state
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // ... submit logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
    </form>
  );
}

// Types for examples
interface User {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
}

interface Comment {
  id: string;
  text: string;
  postId: string;
}

interface Item {
  id: string;
  name: string;
}

interface Order {
  id: string;
  total: number;
}

interface QueryResult {
  user: User;
}

// Mock objects/functions for the examples
declare const axios: {
  get: (url: string) => Promise<{ data: unknown }>;
};

declare const client: {
  query: (options: { query: unknown; variables?: unknown }) => Promise<{ data: unknown }>;
};

declare const GET_USER_QUERY: unknown;

async function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}
