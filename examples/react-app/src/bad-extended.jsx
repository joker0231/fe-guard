/**
 * Tests for rules from boards 9-20 (Windows 2 & 3).
 * Each violation should trigger the corresponding guard/ rule.
 */
import React, { useState, useEffect } from 'react';

// ─── Board 9: Side Effects ───
// guard/no-async-effect already tested, testing no-effect-set-state-loop
export function InfiniteLoop() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(count + 1);
  }, [count]);
  return <div>{count}</div>;
}

// ─── Board 10: Security ───
// guard/no-raw-dangerously-set-innerhtml
export function XSSVulnerable({ content }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// ─── Board 11: AI Smell ───
// guard/no-todo-in-production
export function TodoComponent() {
  // TODO: implement this properly
  return <div>Placeholder</div>;
}

// ─── Board 15: Data Display ───
// guard/no-date-raw-render
export function RawDate({ order }) {
  return <span>{order.createdAt}</span>;
}

// guard/no-boolean-raw-render
export function RawBoolean({ user }) {
  return <span>{user.isActive}</span>;
}

// ─── Board 16: Async Component ───
// guard/async-handler-try-catch
export function UnsafeAsyncHandler() {
  return (
    <button onClick={async () => {
      await fetch('/api/action');
    }}>Do it</button>
  );
}
