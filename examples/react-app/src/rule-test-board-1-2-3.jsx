/**
 * Board 1-3 规则逐条验证
 * 每个函数只测一条规则，注释标注预期错误
 */
import React, { useState, lazy } from 'react';
import { Route, Link, NavLink } from 'react-router-dom';

// ═══ Board 1: Event Handler ═══

// [expect: guard/no-empty-handler]
export function Test_noEmptyHandler() {
  return <button onClick={() => {}}>Click</button>;
}

// [expect: guard/handler-must-exist]
export function Test_handlerMustExist() {
  return <button onClick={handleClick}>Click</button>;
}

// ═══ Board 2: Page Reachability ═══

// [expect: guard/no-dead-link]
export function Test_noDeadLink() {
  return <Link to="">空链接</Link>;
}

// [expect: guard/no-dead-link] NavLink
export function Test_noDeadLink2() {
  return <NavLink to="">空链接</NavLink>;
}

// [expect: guard/require-auth-guard]
export function Test_requireAuthGuard() {
  return <Route path="/admin/panel" element={<div>Admin</div>} />;
}

// [expect: guard/require-auth-guard] dashboard path
export function Test_requireAuthGuard2() {
  return <Route path="/dashboard" element={<div>Dash</div>} />;
}

// [expect: guard/no-location-href-navigate] assignment
export function Test_noLocationHref() {
  return <button onClick={() => { window.location.href = '/profile'; }}>Go</button>;
}

// [expect: guard/no-location-href-navigate] <a href>
export function Test_noLocationHref2() {
  return <a href="/about">About</a>;
}

// ═══ Board 3: Error Boundary ═══

// [expect: guard/require-error-boundary]
export function Test_requireErrorBoundary() {
  return <Route path="/home" element={<div>Home</div>} />;
}

// [expect: guard/require-loading-state + guard/require-error-state]
export function Test_requireLoadingErrorState() {
  const [data, setData] = useState(null);
  const load = async () => {
    try {
      const r = await fetch('/api/x', { signal: new AbortController().signal });
      setData(await r.json());
    } catch(e) {}
  };
  return <div>{data?.name}</div>;
}

// [expect: guard/require-empty-state]
export function Test_requireEmptyState({ items }) {
  return <ul>{items.map(i => <li key={i.id}>{i?.name ?? ''}</li>)}</ul>;
}

// [expect: guard/require-suspense-boundary]
const LazyComp = lazy(() => import('./Lazy'));
export function Test_requireSuspense() {
  return <LazyComp />;
}
