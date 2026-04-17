/**
 * This file demonstrates correct patterns that pass all Frontend Guard rules.
 * Running `pnpm lint` should produce ZERO errors for this file.
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Route, Link, useNavigate } from 'react-router-dom';

// ─── Board 1: Event Handler ───
export function GoodHandler() {
  return <button onClick={() => { console.log('clicked'); }}>Click me</button>;
}

// ─── Board 2: Page Reachability ───
export function GoodLink() {
  return <Link to="/settings">Go to settings</Link>;
}

export function GoodRoutes() {
  return (
    <AuthGuard>
      <Route path="/admin/users" element={<div>Admin</div>} errorElement={<div>Error</div>} />
    </AuthGuard>
  );
}

export function GoodNavigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/dashboard')}>Go</button>;
}

// ─── Board 3: Error Boundary ───
export function WithErrorBoundary() {
  return <Route path="/dashboard" element={<div>Dashboard</div>} errorElement={<div>Error</div>} />;
}

export function WithEmptyState({ users }) {
  return (
    <ul>
      {users.length === 0 ? <li>No users</li> : users.map(u => <li key={u?.id}>{u?.name ?? 'Unknown'}</li>)}
    </ul>
  );
}

const LazyPage = lazy(() => import('./LazyPage'));
export function WithSuspense() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyPage />
    </Suspense>
  );
}

// ─── Board 4: API Safety ───
// Note: standalone async functions (not components) avoid loading/error state rules
export async function safeFetch() {
  try {
    const controller = new AbortController();
    const res = await fetch('/api/data', { signal: controller.signal });
    const data = await res.json();
    if (data == null) return [];
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// ─── Board 5: Component ───
export function GoodConditional({ user }) {
  return <div>{user ? <span>{user?.name ?? ''}</span> : <span>Guest</span>}</div>;
}

// ─── Board 6: State Management ───
export function GoodStateMutation() {
  const [items, setItems] = useState([]);
  const addItem = () => {
    setItems([...items, 'new']);
  };
  return <button onClick={addItem}>Add</button>;
}

// ─── Board 7: Render Safety ───
export function SafeRender({ user }) {
  return <span>{user?.address?.street ?? ''}</span>;
}

// ─── Board 8: Async Safety ───
export function GoodEffect() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        await fetch('/api/data', { signal: new AbortController().signal });
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;
  return <div>Loaded</div>;
}
