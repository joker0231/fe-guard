/**
 * Board 4-6 规则逐条验证
 */
import React, { useState } from 'react';

// ═══ Board 4: API Safety ═══

// [expect: guard/fetch-must-catch]
export async function Test_fetchMustCatch() {
  const res = await fetch('/api/data');
  return res.json();
}

// [expect: guard/response-null-check]
export async function Test_responseNullCheck() {
  try {
    const res = await fetch('/api/data', { signal: new AbortController().signal });
    const data = await res.json();
    return data.users;  // no null check on data
  } catch(e) { return []; }
}

// [expect: guard/api-timeout]
export async function Test_apiTimeout() {
  try {
    const res = await fetch('/api/data');  // no signal
    return await res.json();
  } catch(e) { return null; }
}

// [expect: guard/no-get-with-body]
export async function Test_noGetWithBody() {
  try {
    await fetch('/api/search', { body: JSON.stringify({ q: 'test' }) });
  } catch(e) {}
}

// [expect: guard/safe-json-parse]
export function Test_safeJsonParse(str) {
  const data = JSON.parse(str);
  return data;
}

// ═══ Board 5: Component ═══

// [expect: guard/conditional-render-complete]
export function Test_conditionalRender({ data }) {
  return <div>{data && <span>{data.name}</span>}</div>;
}

// [expect: guard/no-state-in-render]
export function Test_noStateInRender() {
  const [count, setCount] = useState(0);
  setCount(count + 1);
  return <div>{count}</div>;
}

// [expect: guard/no-recursive-without-base]
export function Test_noRecursive({ node }) {
  return <div><Test_noRecursive /></div>;
}

// ═══ Board 6: State Management ═══

// [expect: guard/no-state-mutation]
export function Test_noStateMutation() {
  const [items, setItems] = useState([]);
  const add = () => { items.push('x'); setItems(items); };
  return <button onClick={add}>Add</button>;
}
