/**
 * Board 16 + Extended 规则逐条验证
 */
import React, { useState, useEffect } from 'react';

// ═══ Board 16: Async Component Extension ═══

// [expect: guard/async-handler-try-catch]
export function Test_asyncHandlerTryCatch() {
  return (
    <button onClick={async () => {
      await saveData();
    }}>Save</button>
  );
}

// [expect: guard/controlled-or-uncontrolled] — mixed mode
export function Test_controlledUncontrolled() {
  return <input value="hello" defaultValue="world" />;
}

// [expect: guard/require-debounce-throttle]
export function Test_requireDebounce() {
  return <input onChange={(e) => fetch('/api/search?q=' + e.target.value)} />;
}

// ═══ Extended: Board 17 - Dark Mode ═══

// [expect: guard/no-hardcoded-color]
export function Test_noHardcodedColor() {
  return <div style={{ color: '#ff0000', background: '#ffffff' }}>Red text</div>;
}

// ═══ Extended: Board 18 - Error Recovery ═══

// [expect: guard/token-expiry-handling]
export function Test_tokenExpiry() {
  axios.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(err),  // no 401 handling
  );
  return null;
}

// ═══ Extended: Board 20 ═══

// [expect: guard/list-pagination-or-virtual]
export function Test_listPagination({ items }) {
  return <ul>{items.map(i => <li key={i.id}>{i?.name ?? ''}</li>)}</ul>;
}

// [expect: guard/form-prevent-default]
export function Test_formPreventDefault() {
  const handleSubmit = () => { console.log('submit'); };
  return <form onSubmit={handleSubmit}><button type="submit">Go</button></form>;
}

// [expect: guard/no-derived-state]
export function Test_noDerivedState({ value }) {
  const [doubled, setDoubled] = useState(0);
  useEffect(() => {
    setDoubled(value * 2);
  }, [value]);
  return <div>{doubled}</div>;
}

// [expect: guard/form-validation-required]
export function Test_formValidation() {
  return (
    <form onSubmit={() => {}}>
      <input name="email" />
      <input name="password" />
      <button type="submit">Submit</button>
    </form>
  );
}

// [expect: guard/no-stale-request]
export function Test_noStaleRequest({ query }) {
  useEffect(() => {
    fetch('/api/search?q=' + query).then(r => r.json()).then(console.log);
  }, [query]);
  return <div />;
}

// [expect: guard/require-env-fallback]
export function Test_requireEnvFallback() {
  const apiUrl = process.env.API_URL;
  return <div>{apiUrl}</div>;
}
