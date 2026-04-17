/**
 * Board 7-9 规则逐条验证
 */
import React, { useState, useEffect } from 'react';

// ═══ Board 7: Render Safety ═══

// [expect: guard/no-falsy-render] — 0 rendered as text
export function Test_noFalsyRender({ count }) {
  return <div>{count && <span>Has items</span>}</div>;
}

// [expect: guard/no-undefined-render]
export function Test_noUndefinedRender({ user }) {
  return <span>{user.name}</span>;
}

// ═══ Board 8: Async Safety ═══

// [expect: guard/no-async-effect]
export function Test_noAsyncEffect() {
  useEffect(async () => {
    await fetch('/api');
  }, []);
  return <div />;
}

// [expect: guard/await-in-try] — await non-fetch call
export async function Test_awaitInTry() {
  const result = await processData();
  return result;
}

// ═══ Board 9: Side Effects ═══

// [expect: guard/no-effect-set-state-loop]
export function Test_noEffectLoop() {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal(val + 1);
  }, [val]);
  return <div>{val}</div>;
}

// [expect: guard/no-unnecessary-effect]
export function Test_noUnnecessaryEffect() {
  const [a] = useState(1);
  const [b, setB] = useState(0);
  useEffect(() => {
    setB(a * 2);
  }, [a]);
  return <div>{b}</div>;
}

// [expect: guard/require-cleanup-bindings]
export function Test_requireCleanup() {
  useEffect(() => {
    window.addEventListener('resize', () => {});
  }, []);
  return <div />;
}
