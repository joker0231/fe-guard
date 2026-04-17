/**
 * This file intentionally violates Frontend Guard rules.
 * Running `pnpm lint` should report errors for each violation.
 */
import React, { useState, useEffect, lazy } from 'react';
import { Route, Link } from 'react-router-dom';

// ─── Board 1: Event Handler ───
// guard/no-empty-handler: empty onClick
export function EmptyHandler() {
  return <button onClick={() => {}}>Click me</button>;
}

// ─── Board 2: Page Reachability ───
// guard/no-dead-link: empty link target
export function DeadLink() {
  return <Link to="">Go nowhere</Link>;
}

// guard/require-auth-guard: admin route without auth guard
export function UnsafeRoutes() {
  return <Route path="/admin/users" element={<div>Admin</div>} />;
}

// guard/no-location-href-navigate: using window.location for internal nav
export function BadNavigation() {
  return <button onClick={() => { window.location.href = '/dashboard'; }}>Go</button>;
}

// ─── Board 3: Error Boundary ───
// guard/require-error-boundary: route without error boundary
export function NoErrorBoundary() {
  return <Route path="/dashboard" element={<div>Dashboard</div>} />;
}

// guard/require-empty-state: list without empty check
export function NoEmptyState({ users }) {
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// guard/require-suspense-boundary: lazy without Suspense
const LazyPage = lazy(() => import('./LazyPage'));
export function NoSuspense() {
  return <LazyPage />;
}

// ─── Board 4: API Safety ───
// guard/fetch-must-catch: unhandled fetch
export async function UncaughtFetch() {
  const res = await fetch('/api/data');
  return res.json();
}

// guard/api-timeout: fetch without signal
export async function NoTimeout() {
  try {
    const res = await fetch('/api/data');
    return res.json();
  } catch (e) {
    console.error(e);
  }
}

// guard/no-get-with-body: GET with body
export async function GetWithBody() {
  try {
    await fetch('/api/search', { body: JSON.stringify({ q: 'test' }) });
  } catch (e) {
    console.error(e);
  }
}

// guard/safe-json-parse: unprotected JSON.parse
export function UnsafeParse(str) {
  const data = JSON.parse(str);
  return data;
}

// ─── Board 5: Component ───
// guard/no-state-in-render: setState in render path
export function RenderSetState() {
  const [count, setCount] = useState(0);
  setCount(count + 1);
  return <div>{count}</div>;
}

// ─── Board 6: State Management ───
// guard/no-state-mutation: direct state mutation
export function StateMutation() {
  const [items, setItems] = useState([]);
  const addItem = () => {
    items.push('new');
    setItems(items);
  };
  return <button onClick={addItem}>Add</button>;
}

// ─── Board 7: Render Safety ───
// guard/no-undefined-render: rendering potentially undefined property
export function UndefinedRender({ user }) {
  return <span>{user.address.street}</span>;
}

// ─── Board 8: Async Safety ───
// guard/no-async-effect: async useEffect callback
export function AsyncEffect() {
  useEffect(async () => {
    await fetch('/api/data');
  }, []);
  return <div>Loaded</div>;
}
